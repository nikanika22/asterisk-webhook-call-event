import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AsteriskService } from '../../core/asterisk/asterisk.service';
import { StoreService } from '../../shared/store/store.service';
import { SocketService } from '../../shared/socket/socket.service';
import { CallEventService } from './call/call-event.service';
import { WebhookService } from '../webhook/webhook.service';
import { encodeDataToClient, getTimeFormat, getDurationTime, checkExtension, parseChannel } from '../../shared/helpers/helpers';
const INTERNAL_CONTEXTS = ['from-internal', 'from-extensions', 'dialOne-with-exten'];
const OUTBOUND_CONTEXTS = ['trunk-dial-with-exten', 'from-internal-to-trunk'];
const INBOUND_CONTEXTS = ['from-pstn', 'from-trunk', 'from-mas', 'ext-queues', 'dial-with-exten'];

@Injectable()
export class AsteriskEventService implements OnModuleInit {
  private readonly logger = new Logger(AsteriskEventService.name);
  private readonly backFilePath = path.join(process.cwd(), 'logs', 'dial_statebackup.json');

  constructor(
    private readonly asterisk: AsteriskService,
    private readonly store: StoreService,
    private readonly socketService: SocketService,
    private readonly callEventService: CallEventService,
    private readonly webhookService: WebhookService,
  ) { }

  onModuleInit() {
    this.restoreState();
    this.attachListeners();
  }

  private backupStateAsync() {
    try {
      if (!fs.existsSync(path.dirname(this.backFilePath))) {
        fs.mkdirSync(path.dirname(this.backFilePath), { recursive: true });
      }
      const payload = JSON.stringify({ arrDialState: this.store.arrDialState, arrBranchState: this.store.arrBranchState }, null, 2);
      fs.writeFile(this.backFilePath, payload, (err) => {
        if (err) this.logger.error('Backup state file write error:', err);
      });
    } catch (error) {
      this.logger.error('Backup state error:', error);
    }
  }

  private restoreState() {
    try {
      if (fs.existsSync(this.backFilePath)) {
        const data = fs.readFileSync(this.backFilePath, 'utf8');
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && 'arrDialState' in parsed) {
          this.store.arrDialState = parsed.arrDialState || {};
          this.store.arrBranchState = parsed.arrBranchState || {};
        } else {
          this.store.arrDialState = parsed;
          this.store.arrBranchState = {};
        }
      }
    } catch (error) {
      this.logger.error('Restore state error:', error);
    }
  }

  private attachListeners() {
    const io = () => this.socketService.getIO();

    // === Extension Status ===
    this.asterisk.on('extensionstatus', (data) => {
      const outputParams = {
        Exten: data.exten,
        StatusText: data.statustext,
        Channel: (data.hint || '').split(',')[0],
        Status: data.status,
      };
      io()?.sockets.emit('deviceStatus', encodeDataToClient(outputParams));
    });

    // === CoreShowChannels ===
    this.asterisk.on('coreshowchannel', (data) => {
      io()?.sockets.emit('showChannel', encodeDataToClient(data));
    });

    // === QueueMemberPause ===
    this.asterisk.on('queuememberpause', (data) => {
      io()?.sockets.emit('queuememberpause', encodeDataToClient(data));
    });

    // === QueueCallerJoin / Leave ===
    this.asterisk.on('queuecallerjoin', (data) => {
      this.store.arrQueue[data.uniqueid] = { queue: data.queue, did: data.calleridnum };
      io()?.sockets.emit('queuecallerjoin', encodeDataToClient(data));
    });
    this.asterisk.on('queuecallerleave', (data) => {
      io()?.sockets.emit('queuecallerleave', encodeDataToClient(data));
    });

    // === AgentConnect ===
    this.asterisk.on('agentconnect', (data) => {
      io()?.sockets.emit('agentconnect', encodeDataToClient(data));
      if (this.store.arrDialState[data.uniqueid]) {
        this.store.arrDialState[data.uniqueid].status = 'answered';
        this.store.arrDialState[data.uniqueid].answertime = getTimeFormat();
      }
    });

    // === Queue Status Events ===
    this.asterisk.on('queuememberstatus', (data) => io()?.sockets.emit('queueMemberStatus', encodeDataToClient(data)));
    this.asterisk.on('queuememberremoved', (data) => io()?.sockets.emit('queueMemberRemoved', encodeDataToClient(data)));
    this.asterisk.on('queuememberadded', (data) => io()?.sockets.emit('queueMemberAdded', encodeDataToClient(data)));
    this.asterisk.on('queuemember', (data) => io()?.sockets.emit('queueMember', encodeDataToClient(data)));

    // === QueueSummary ===
    this.asterisk.on('queuesummary', (data) => {
      io()?.sockets.emit('queueSummary', encodeDataToClient(data));
      for (const e in this.store.arrWebhook) {
        if (
          this.store.arrWebhook[e]['queues'].indexOf(data.queue) > -1 &&
          this.store.arrWebhook[e]['webhook_info']?.['call']?.indexOf('QueueSummary') > -1
        ) {
          const params = { object: 'call', event: 'QueueSummary', value: data };
          this.webhookService.sendPostRequestv2(this.store.arrWebhook[e]['webhook_url']['callcenter'], params);
        }
      }
    });

    // === QueueStatus ===
    this.asterisk.on('queuestatus', (data) => io()?.sockets.emit('queueStatus', encodeDataToClient(data)));

    // === MeetMe ===
    this.asterisk.on('meetmejoin', (data) => {
      this.store.arrChanspy[data.uniqueid] = {
        uniqueid: data.uniqueid,
        channel: data.channel,
        chanspy_ext: '',
        starttime: getTimeFormat(),
      };
      io()?.sockets.emit('meetmejoin', encodeDataToClient(data));
    });
    this.asterisk.on('meetmeleave', (data) => {
      delete this.store.arrChanspy[data.uniqueid];
      io()?.sockets.emit('meetmeleave', encodeDataToClient(data));
    });

    // === ChanSpy ===
    this.asterisk.on('chanspystart', (data) => io()?.sockets.emit('chanspystart', encodeDataToClient(data)));
    this.asterisk.on('chanspystop', (data) => io()?.sockets.emit('chanspystop', encodeDataToClient(data)));

    // === DialBegin ===
    this.asterisk.on('dialbegin', (data) => {
      const linkedid = data.linkedid;
      this.store.uniqueidToLinkedid[data.uniqueid] = linkedid;

      const destchannel = data.destchannel || '';
      const connectedlinenum = data.connectedlinenum || '';

      const channel = data.channel || '';
      const ext = parseChannel(channel) || '';
      const calleridnum = data.calleridnum || '';
      // Phân loại cuộc gọi
      let calltype = 'Unknown';
      if (OUTBOUND_CONTEXTS.includes(data.context)) {
        calltype = 'Outbound';
      } else if (INTERNAL_CONTEXTS.includes(data.context) || INTERNAL_CONTEXTS.includes(data.destcontext)) {
        calltype = 'Internal';
      } else if (INBOUND_CONTEXTS.includes(data.context)) {
        calltype = 'Inbound';
      } else {
        if (calleridnum.length > 5) calltype = 'Inbound';
        else if ((data.destcalleridnum || data.exten || '').length > 5) calltype = 'Outbound';
        else calltype = 'Internal';
      }
      let tonumber_val = '';
      if (calltype === 'Outbound') {
        tonumber_val = connectedlinenum !== '<unknown>' ? connectedlinenum
          : (data.destcalleridnum || data.exten || '');
      } else {
        const destExt = parseChannel(destchannel);
        tonumber_val = destExt || data.destcalleridnum || '';
      }

      if ((channel.includes('SIP/') || channel.includes('LOCAL') || channel.includes('Local') || channel.includes('PJSIP')) &&
        (destchannel.includes('SIP/') || destchannel.includes('LOCAL') || destchannel.includes('Local') || destchannel.includes('PJSIP'))) {

        let webhook_select: any = null;
        for (const e in this.store.arrWebhook) {
          if (this.store.arrWebhook[e].extensions.indexOf(ext) > -1) {
            webhook_select = this.store.arrWebhook[e];
            break;
          }
        }

        const masterAlreadyExisted = !!this.store.arrDialState[linkedid];
        const isDestLocal = destchannel.toLowerCase().startsWith('local/');

        if (!masterAlreadyExisted) {
          this.store.arrDialState[linkedid] = {
            fromnumber: calleridnum,
            calltype,
            channel,
            extension: parseChannel(destchannel) || ' ',
            starttime: getTimeFormat(),
            status: 'initiating',
            destination: (calltype !== 'Outbound') ? data.exten : ' ',
            callrefid: linkedid,
            linkedid: linkedid,
            webhookurl: webhook_select?.webhook_url?.callcenter || '',
            recordingurl: webhook_select?.recording_url || '',
            groupid: webhook_select?.id || '',
            tonumber: tonumber_val,
            destchannel: destchannel,
          };
        } else {
          // Master exists — only fill in webhook config if not yet set
          if (!this.store.arrDialState[linkedid].webhookurl && webhook_select) {
            this.store.arrDialState[linkedid].webhookurl = webhook_select.webhook_url?.callcenter || '';
            this.store.arrDialState[linkedid].recordingurl = webhook_select.recording_url || '';
            this.store.arrDialState[linkedid].groupid = webhook_select.id || '';
          }
        }

        if (isDestLocal) {
          // Outer dialbegin (Queue proxy): no branch state, return early
          this.backupStateAsync();
          this.logger.log(`dialbegin [OUTER, master=${masterAlreadyExisted ? 'existed' : 'created'}]: ${JSON.stringify(this.store.arrDialState[linkedid], null, 2)}`);
          return;
        }

        // Non-local destchannel: create branch state (inner Queue OR direct RingGroup/1-1)
        const branchKey = `${linkedid}::${destchannel}`;
        const master = this.store.arrDialState[linkedid];
        this.store.arrBranchState[branchKey] = {
          fromnumber: calleridnum,
          calltype: master.calltype, // Kế thừa calltype từ master, tránh việc bị đổi thành Internal
          destchannel: destchannel,
          extension: parseChannel(destchannel) || ' ',
          tonumber: tonumber_val,
          destination: (calltype !== 'Outbound') ? data.exten : ' ',
          starttime: getTimeFormat(),
          status: 'initiating',
          webhookurl: master.webhookurl,
          recordingurl: master.recordingurl,
          groupid: master.groupid,
          callrefid: linkedid,
          linkedid,
        };

        // Nhánh thứ 2 trở đi với cùng linkedid → đây là multi-branch (RingGroup hoặc Queue inner)
        if (masterAlreadyExisted) {
          this.store.arrDialState[linkedid].isMultiBranch = true;
        }

        this.logger.log(`dialbegin [BRANCH CREATED]: key=${branchKey}, branch=${JSON.stringify(this.store.arrBranchState[branchKey], null, 2)}`);
        this.backupStateAsync();

        if (master.webhookurl) {
          // Truyền branchState trực tiếp — không cần swap Master
          const branch = this.store.arrBranchState[branchKey];
          this.callEventService.makeCallEventv2('ringing', linkedid, masterAlreadyExisted ? branch : undefined);
        }
      }
    });

    // === DialEnd ===
    this.asterisk.on('dialend', (data) => {
      const linkedid = data.linkedid;
      const state = this.store.arrDialState[linkedid];
      if (!state) return;
      const destchannel = data.destchannel || '';

      if (destchannel.toLowerCase().startsWith('local/')) return;

      if (data.dialstatus === 'ANSWER') {
        state.destchannel = destchannel;
        if (state.calltype !== 'Outbound') {
          state.tonumber = parseChannel(destchannel) || data.destcalleridnum || state.tonumber;
        }
        state.extension = parseChannel(destchannel) || " ";
        state.destination = (state.calltype !== "Outbound") ? (data.exten || " ") : " ";
        state.status = 'answered';
        this.logger.log(`dialend [ANSWER]: ${JSON.stringify(state, null, 2)}`);
        this.callEventService.makeCallEventv2('answered', linkedid);
        this.backupStateAsync();
      }
    });

    // === DialState ===
    this.asterisk.on('dialstate', (data) => {
      const linkedid = data.linkedid;
      const state = this.store.arrDialState[linkedid];
      if (!state) return;

      const destchannel = data.destchannel || '';

      // Bỏ qua event của kênh ảo
      if (destchannel.toLowerCase().startsWith('local/')) return;

      if (['RINGING', 'NOANSWER', 'CONGESTION', 'CANCELLED', 'PROGRESS', 'BUSY'].includes(data.dialstatus)) {
        const lowerState = data.dialstatus.toLowerCase();
        const branchKey = `${linkedid}::${destchannel}`;
        const branchState = this.store.arrBranchState[branchKey];

        if (branchState) {
          branchState.status = lowerState;
          this.logger.log(`dialstate [${data.dialstatus}]: key=${branchKey}, status=${lowerState}`);
        } else {
          // No branch state — fallback: update master directly (cuộc gọi 1-1 thông thường)
          state.status = lowerState;
          state.destchannel = destchannel;
          if (state.calltype !== 'Outbound') {
            state.tonumber = parseChannel(destchannel) || data.destcalleridnum || state.tonumber;
          }
          state.extension = parseChannel(destchannel) || ' ';
          state.destination = (state.calltype !== 'Outbound') ? (data.exten || ' ') : ' ';
          this.logger.log(`dialstate [${data.dialstatus}]: ${JSON.stringify(state, null, 2)}`);
          this.backupStateAsync();
        }
      }
    });

    // === Hangup ===
    this.asterisk.on('hangup', (data) => {
      const linkedid = data.linkedid;
      const state = this.store.arrDialState[linkedid];
      if (!state) return;

      const isMaster = data.uniqueid === data.linkedid;
      const channel = data.channel || '';
      const isLocalChannel = channel.toLowerCase().startsWith('local/');

      if (isLocalChannel) {
        this.logger.debug(`hangup [LOCAL channel ignored=${channel}]`);
        return;
      }

      if (isMaster) {
        state.status = 'hangup';

        // Override để đảm bảo payload dùng kênh/extension của Caller, không nhầm của nhánh
        const masterOverride = {
          channel: state.channel,
          destchannel: state.channel,
          extension: parseChannel(state.channel) || state.fromnumber,
          tonumber: state.tonumber,
          status: 'hangup',
        };

        this.logger.log(`hangup [MASTER, channel=${channel}]: ${JSON.stringify({ ...state, ...masterOverride }, null, 2)}`);
        this.callEventService.makeCallEventv2('hangup', linkedid, masterOverride);

        setTimeout(() => {
          delete this.store.arrDialState[linkedid];
          for (const [uid, lid] of Object.entries(this.store.uniqueidToLinkedid)) {
            if (lid === linkedid) delete this.store.uniqueidToLinkedid[uid];
          }
          for (const key of Object.keys(this.store.arrCompleteCall)) {
            if (key.startsWith(`${linkedid}::`)) delete this.store.arrCompleteCall[key];
          }
          for (const key of Object.keys(this.store.arrBranchState)) {
            if (key.startsWith(`${linkedid}::`)) delete this.store.arrBranchState[key];
          }
          if (fs.existsSync(this.backFilePath)) fs.unlink(this.backFilePath, () => { });
        }, 50);
      } else {
        // Tra branchState — nếu có thì truyền thẳng, không cần swap Master
        const branchKey = `${linkedid}::${channel}`;
        const branchState = this.store.arrBranchState[branchKey];

        const branchOverride = branchState || {
          destchannel: channel,
          tonumber: (state.calltype !== 'Outbound') ? (parseChannel(channel) || state.tonumber) : state.tonumber,
          extension: parseChannel(channel) || ' ',
          destination: (state.calltype !== 'Outbound') ? (data.exten || ' ') : ' ',
        };
        branchOverride.status = 'hangup';

        this.logger.log(`hangup [branch, channel=${channel}]: ${JSON.stringify({ ...state, ...branchOverride }, null, 2)}`);
        this.callEventService.makeCallEventv2('hangup', linkedid, branchOverride);

        // Early CDR Synthesis tại hangup → hangup webhook luôn gửi trước misscall
        // isAnsweredBranch: dùng master state.destchannel (set tại dialend[ANSWER]) để phân biệt nhánh đã answered
        const isAnsweredBranch = state.status === 'answered' && channel === state.destchannel;
        if (state.isMultiBranch && branchState && !isAnsweredBranch && !this.store.arrCompleteCall[branchKey]) {
          this.store.arrCompleteCall[branchKey] = {
            synthetic: true,
            disposition: 'NOANSWER',
            duration: '0',
            billableseconds: '0',
            endtime: getTimeFormat(),
            destinationchannel: channel,
          };
          branchState.status = 'misscall';
          this.logger.log(`hangup [EARLY CDR synthesis, misscall]: key=${branchKey}`);
          this.callEventService.makeCallEventv2('misscall', linkedid, branchState);
        }
      }
    });

    // === CDR Event ===
    this.asterisk.on('cdr', (data) => {
      const linkedid = this.store.uniqueidToLinkedid[data.uniqueid] || data.uniqueid;
      const state = this.store.arrDialState[linkedid];
      if (!state) return;

      // Bỏ qua CDR giả/đảo luồng
      if (!data.destinationchannel || data.destinationchannel.startsWith('AppDial')) return;
      if (data.destinationcontext === 'app-blackhole') return;
      if (data.lastapplication !== 'Dial') return;
      const destchannel = data.destinationchannel;
      const legKey = `${linkedid}::${destchannel}`;

      if (this.store.arrCompleteCall[legKey]) {
        this.logger.debug(`cdr [SKIP, already processed]: ${legKey}`);
        return;
      }

      this.store.arrCompleteCall[legKey] = data;

      // Tra branchState — nếu có thì truyền thẳng, không cần swap Master
      const branchState = this.store.arrBranchState[legKey];
      const eventType = data.disposition === 'ANSWERED' ? 'completed' : 'misscall';

      const branchOverride = branchState || {
        destchannel: destchannel,
        tonumber: (state.calltype !== 'Outbound') ? (parseChannel(destchannel) || state.tonumber) : state.tonumber,
        extension: parseChannel(destchannel) || state.extension,
      };
      branchOverride.status = eventType;
      branchOverride.disposition = data.disposition;

      this.logger.log(`cdr [${eventType}]: ${JSON.stringify({ ...state, ...branchOverride }, null, 2)}`);
      this.callEventService.makeCallEventv2(eventType, linkedid, branchOverride);
    });




    // === NewExten Event (Recording logging) ===
    this.asterisk.on('newexten', (data) => {
      if ((data.application === 'AGI' || data.application === 'MixMonitor') && data.appdata?.match('.WAV')) {
        const extChannel = data.channel || '';
        const curContext = data.context;
        const curAppData = data.appdata;
        let checkExt = '';
        let recordingFile = '';
        if (extChannel.match('SIP/')) checkExt = extChannel.substring(extChannel.lastIndexOf('SIP/') + 4, extChannel.lastIndexOf('-'));
        else if (extChannel.match('Local/')) checkExt = extChannel.substring(extChannel.lastIndexOf('Local/') + 6, extChannel.lastIndexOf('@'));

        const resCallInfo = {
          src: data.calleridnum,
          dst: checkExt,
          call_type: '',
          recordingfile: '',
          uniqueid: data.uniqueid,
          linkedid: data.linkedid,
        };
        if (curContext === 'sub-record-check' || curContext === 'agentqueue') {
          resCallInfo.call_type = 'in';
          recordingFile = curAppData.split(',')[0];
        } else if (curContext === 'macro-hangupcall') {
          resCallInfo.call_type = 'out';
          resCallInfo.src = checkExt;
          resCallInfo.dst = data.connectedlinenum;
          recordingFile = curAppData.split(',')[2];
        }
        recordingFile = (recordingFile || '').replace('data/callrecording/', '');
        if (recordingFile) {
          resCallInfo.recordingfile = recordingFile;
          this.store.arrRecordingFile[this.store.arrRecordingFile[data.linkedid] ? data.uniqueid : data.linkedid] = resCallInfo;
        }
      }
    });

    // === PeerStatus Event ===
    this.asterisk.on('peerstatus', (data) => {
      io()?.sockets.emit('peerStatus', encodeDataToClient(data));
    });

    // === DeviceStateChange Event ===
    this.asterisk.on('devicestatechange', (data) => {
      const ext = (data.device || '').split('/').pop();
      for (const key in this.store.arrWebhook) {
        if (
          this.store.arrWebhook[key].extensions.indexOf(ext) > -1 &&
          this.store.arrWebhook[key]['webhook_url'] &&
          this.store.arrWebhook[key]['webhook_info']?.['call']?.indexOf('extstatus') > -1
        ) {
          const params = {
            object: 'call',
            event: 'AgentStatus',
            value: { extension: ext, status: data.state.toLowerCase(), code: 200 },
          };
          this.webhookService.sendPostRequestv2(this.store.arrWebhook[key]['webhook_url']['callcenter'], params);
        }
      }
    });
  }
}
