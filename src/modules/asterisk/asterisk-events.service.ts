import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AsteriskService } from '../../core/asterisk/asterisk.service';
import { StoreService } from '../../shared/store/store.service';
import { SocketService } from '../../shared/socket/socket.service';
import { CallEventService } from './call/call-event.service';
import { WebhookService } from '../webhook/webhook.service';
import { encodeDataToClient, getTimeFormat, checkExtension } from '../../shared/helpers/helpers';
const INTERNAL_CONTEXTS = ['from-internal', 'from-extensions'];
const OUTBOUND_CONTEXTS = ['trunk-dial-with-exten', 'from-internal-to-trunk'];
const INBOUND_CONTEXTS = ['from-pstn', 'from-trunk', 'from-mas'];

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

  private backupState() {
    try {
      if (!fs.existsSync(path.dirname(this.backFilePath))) {
        fs.mkdirSync(path.dirname(this.backFilePath), { recursive: true });
      }
      fs.writeFileSync(this.backFilePath, JSON.stringify(this.store.arrDialState, null, 2));
    } catch (error) {
      this.logger.error('Backup state error:', error);
    }
  }

  private restoreState() {
    try {
      if (fs.existsSync(this.backFilePath)) {
        const data = fs.readFileSync(this.backFilePath, 'utf8');
        this.store.arrDialState = JSON.parse(data);
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

    // === CDR ===
    this.asterisk.on('cdr', (data) => {
      if (this.store.arrDialState[data.uniqueid]) this.store.arrCompleteCall[data.uniqueid] = data;
      this.callEventService.makeCallEventv2(data.event.toLowerCase(), data.uniqueid);
    });

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
      const channel = data.channel || '';
      const destchannel = data.destchannel || '';
      const calleridnum = data.calleridnum || '';
      const connectedlinenum = data.connectedlinenum || '';
      let calltype = '';

      if (INTERNAL_CONTEXTS.includes(data.context) && INTERNAL_CONTEXTS.includes(data.destcontext)) {
        calltype = 'Internal';
      } else if (OUTBOUND_CONTEXTS.includes(data.context)) {
        calltype = 'Outbound';
      } else if (INBOUND_CONTEXTS.includes(data.context)) {
        calltype = 'Inbound';
      } else {
        calltype = 'Unknown';
      }
      const phoneNumber = calltype === 'Inbound' ? calleridnum : connectedlinenum;

      if ((channel.includes('SIP/') || channel.includes('LOCAL')) &&
        (destchannel.includes('SIP/') || destchannel.includes('LOCAL'))) {
        const ext = checkExtension(channel);
        let webhook_select: any = null;
        for (const e in this.store.arrWebhook) {
          if (this.store.arrWebhook[e].extensions.indexOf(ext) > -1) {
            webhook_select = this.store.arrWebhook[e];
            break;
          }
        }
        if (webhook_select) {
          const uniqueid = data.uniqueid;
          this.store.arrDialState[uniqueid] = {
            fromnumber: calleridnum,
            tonumber: connectedlinenum,
            extension: ext,
            phoneNumber: phoneNumber,
            calltype: calltype,
            channel,
            destchannel,
            starttime: getTimeFormat(),
            status: 'initiating',
            callrefid: uniqueid,
            linkedid: data.linkedid,
            webhookurl: webhook_select['webhook_url']['callcenter'],
            recordingurl: webhook_select['recording_url'],
            groupid: webhook_select['id'],
          };
          this.backupState();
          this.logger.log(`dialbegin: ${JSON.stringify(this.store.arrDialState[uniqueid], null, 2)}`);
          this.callEventService.makeCallEventv2('ringing', uniqueid);
        }
      }
    });

    // === DialEnd ===
    this.asterisk.on('dialend', (data) => {
      if (!this.store.arrDialState[data.uniqueid]) return;
      if (data.dialstatus === 'ANSWER') {
        this.store.arrDialState[data.uniqueid].status = 'answered';
        this.callEventService.makeCallEventv2('answered', data.uniqueid);
        this.backupState();
      } else if (['NOANSWER', 'CONGESTION', 'CANCEL'].includes(data.dialstatus)) {
        this.store.arrDialState[data.uniqueid].status = data.dialstatus.toLowerCase();
        this.backupState();
      }
    });

    // === DialState ===
    this.asterisk.on('dialstate', (data) => {
      if (!this.store.arrDialState[data.uniqueid]) return;
      if (['RINGING', 'NOANSWER', 'CONGESTION', 'CANCELLED', 'PROGRESS', 'BUSY'].includes(data.dialstatus)) {
        this.store.arrDialState[data.uniqueid].status = data.dialstatus.toLowerCase();
        this.backupState();
      }
    });

    // === Hangup ===
    this.asterisk.on('hangup', (data) => {
      const uniqueid = data.uniqueid;
      if (this.store.arrDialState[uniqueid]) {
        this.store.arrDialState[uniqueid].status = 'hangup';
        this.callEventService.makeCallEventv2('hangup', data.uniqueid);
        delete this.store.arrDialState[uniqueid];
        if (fs.existsSync(this.backFilePath)) {
          try {
            fs.unlinkSync(this.backFilePath);
          } catch (err) {
            // ignore
          }
        }
      }
    });

    // === Manager Event (catch-all) ===
    this.asterisk.on('managerevent', (data) => {
      const event = (data.event || '').toUpperCase();

      if (event === 'CDR') {
        if (this.store.arrDialState[data.uniqueid]) this.store.arrCompleteCall[data.uniqueid] = data;
      }

      if (event === 'NEWEXTEN' && (data.application === 'AGI' || data.application === 'MixMonitor') && data.appdata?.match('.WAV')) {
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

      if (event === 'PEERSTATUS') io()?.sockets.emit('peerStatus', encodeDataToClient(data));

      if (event === 'DEVICESTATECHANGE') {
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
      }
    });
  }
}
