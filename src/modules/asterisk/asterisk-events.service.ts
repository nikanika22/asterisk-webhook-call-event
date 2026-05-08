import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AsteriskService } from '../../core/asterisk/asterisk.service';
import { StoreService } from '../../shared/store/store.service';
import { SocketService } from '../../shared/socket/socket.service';
import { CallEventService } from './call/call-event.service';
import { WebhookService } from '../webhook/webhook.service';
import { encodeDataToClient, getTimeFormat, parseChannel } from '../../shared/helpers/helpers';
import {
  backupStateAsync, restoreState, classifyCall, isValidChannelForWebhook,
  buildMasterState, buildBranchState, cleanupCallState, createSyntheticCdr,
  findWebhookByExtension, extractRecordingInfo, resolveBranchOverride,
  applyChannelStateUpdate, buildMasterHangupOverride, updateMasterWebhookIfMissing,
  buildBranchKey, buildExtensionStatusPayload, storeQueueCaller, applyAgentConnect,
  buildQueueSummaryWebhook, storeChanspy, removeChanspy, resolveRecordingKey,
  buildDeviceStateWebhook, isValidCdrEvent, shouldSynthesizeMisscall,
  SOCKET_RELAY,
} from '../../shared/helpers/helperAsterisk';

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
    restoreState(this.store, this.backFilePath, this.logger);
    this.attachListeners();
  }

  private backupStateAsync() {
    backupStateAsync(this.store, this.backFilePath, this.logger);
  }

  private attachListeners() {
    const io = () => this.socketService.getIO();

    SOCKET_RELAY.forEach(([event, socketEvent]) =>
      this.asterisk.on(event, (data) => io()?.sockets.emit(socketEvent, encodeDataToClient(data)))
    );

    this.asterisk.on('extensionstatus', (data) => {
      io()?.sockets.emit('deviceStatus', encodeDataToClient(buildExtensionStatusPayload(data)));
    });

    this.asterisk.on('queuecallerjoin', (data) => {
      storeQueueCaller(this.store, data);
      io()?.sockets.emit('queuecallerjoin', encodeDataToClient(data));
    });

    this.asterisk.on('agentconnect', (data) => {
      io()?.sockets.emit('agentconnect', encodeDataToClient(data));
      applyAgentConnect(this.store, data);
    });

    this.asterisk.on('queuesummary', (data) => {
      io()?.sockets.emit('queueSummary', encodeDataToClient(data));
      for (const { url, params } of buildQueueSummaryWebhook(this.store.arrWebhook, data)) {
        this.webhookService.sendPostRequestv2(url, params);
      }
    });

    this.asterisk.on('meetmejoin', (data) => {
      storeChanspy(this.store, data);
      io()?.sockets.emit('meetmejoin', encodeDataToClient(data));
    });

    this.asterisk.on('meetmeleave', (data) => {
      removeChanspy(this.store, data.uniqueid);
      io()?.sockets.emit('meetmeleave', encodeDataToClient(data));
    });

    this.asterisk.on('newexten', (data) => {
      const recordInfo = extractRecordingInfo(data);
      if (recordInfo) {
        this.store.arrRecordingFile[resolveRecordingKey(this.store, data)] = recordInfo;
      }
    });

    this.asterisk.on('devicestatechange', (data) => {
      for (const { url, params } of buildDeviceStateWebhook(this.store.arrWebhook, data)) {
        this.webhookService.sendPostRequestv2(url, params);
      }
    });

    this.asterisk.on('dialbegin', (data) => this.onDialBegin(data));
    this.asterisk.on('dialend', (data) => this.onDialEnd(data));
    this.asterisk.on('dialstate', (data) => this.onDialState(data));
    this.asterisk.on('hangup', (data) => this.onHangup(data));
    this.asterisk.on('cdr', (data) => this.onCdr(data));
  }

  private onDialBegin(data: any) {
    const linkedid = data.linkedid;
    this.store.uniqueidToLinkedid[data.uniqueid] = linkedid;

    const destchannel = data.destchannel || '';
    const connectedlinenum = data.connectedlinenum || '';

    const channel = data.channel || '';
    const ext = parseChannel(channel) || '';
    const calleridnum = data.calleridnum || '';

    const { calltype, tonumber_val } = classifyCall(data, calleridnum, connectedlinenum, destchannel);

    if (isValidChannelForWebhook(channel, destchannel)) {

      const webhook_select = findWebhookByExtension(this.store.arrWebhook, ext);

      const masterAlreadyExisted = !!this.store.arrDialState[linkedid];
      const isDestLocal = destchannel.toLowerCase().startsWith('local/');

      if (!masterAlreadyExisted) {
        this.store.arrDialState[linkedid] = buildMasterState(
          data, calleridnum, calltype, channel, destchannel, tonumber_val, linkedid, webhook_select, getTimeFormat()
        );
        const queueInfo = this.store.arrQueue[linkedid];
        if (queueInfo?.queue) {
          this.store.arrDialState[linkedid].queue = queueInfo.queue;
        }
      } else {
        updateMasterWebhookIfMissing(this.store.arrDialState[linkedid], webhook_select);
      }

      if (isDestLocal) {
        this.backupStateAsync();
        this.logger.log(`dialbegin [OUTER, master=${masterAlreadyExisted ? 'existed' : 'created'}]: ${JSON.stringify(this.store.arrDialState[linkedid], null, 2)}`);
        return;
      }

      const branchKey = buildBranchKey(linkedid, destchannel);
      const master = this.store.arrDialState[linkedid];
      this.store.arrBranchState[branchKey] = buildBranchState(
        master, calleridnum, destchannel, tonumber_val, linkedid, getTimeFormat()
      );

      if (masterAlreadyExisted) {
        this.store.arrDialState[linkedid].isMultiBranch = true;
      }

      this.logger.log(`dialbegin [BRANCH CREATED]: key=${branchKey}, branch=${JSON.stringify(this.store.arrBranchState[branchKey], null, 2)}`);
      this.backupStateAsync();

      if (master.webhookurl) {
        const branch = this.store.arrBranchState[branchKey];
        this.callEventService.makeCallEventv2('ringing', linkedid, masterAlreadyExisted ? branch : undefined);
      }
    }
  }

  private onDialEnd(data: any) {
    const linkedid = data.linkedid;
    const state = this.store.arrDialState[linkedid];
    if (!state) return;
    const destchannel = data.destchannel || '';

    if (destchannel.toLowerCase().startsWith('local/')) return;

    if (data.dialstatus === 'ANSWER') {
      applyChannelStateUpdate(state, destchannel, data, 'answered');
      this.logger.log(`dialend [ANSWER]: ${JSON.stringify(state, null, 2)}`);
      this.callEventService.makeCallEventv2('answered', linkedid);
      this.backupStateAsync();
    }
  }

  private onDialState(data: any) {
    const linkedid = data.linkedid;
    const state = this.store.arrDialState[linkedid];
    if (!state) return;

    const destchannel = data.destchannel || '';

    if (destchannel.toLowerCase().startsWith('local/')) return;

    if (['RINGING', 'NOANSWER', 'CONGESTION', 'CANCELLED', 'PROGRESS', 'BUSY'].includes(data.dialstatus)) {
      const lowerState = data.dialstatus.toLowerCase();
      const branchKey = buildBranchKey(linkedid, destchannel);
      const branchState = this.store.arrBranchState[branchKey];

      if (branchState) {
        branchState.status = lowerState;
        this.logger.log(`dialstate [${data.dialstatus}]: key=${branchKey}, status=${lowerState}`);
      } else {
        applyChannelStateUpdate(state, destchannel, data, lowerState);
        this.logger.log(`dialstate [${data.dialstatus}]: ${JSON.stringify(state, null, 2)}`);
        this.backupStateAsync();
      }
    }
  }

  private onHangup(data: any) {
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

      const masterOverride = buildMasterHangupOverride(state, data);

      this.logger.log(`hangup [MASTER, channel=${channel}]: ${JSON.stringify({ ...state, ...masterOverride }, null, 2)}`);
      this.callEventService.makeCallEventv2('hangup', linkedid, masterOverride);

      setTimeout(() => {
        cleanupCallState(this.store, linkedid, this.backFilePath);
      }, 50);
    } else {
      const branchKey = buildBranchKey(linkedid, channel);
      const branchState = this.store.arrBranchState[branchKey];

      const branchOverride = resolveBranchOverride(branchState, channel, state, state.destination);
      branchOverride.status = 'hangup';

      this.logger.log(`hangup [branch, channel=${channel}]: ${JSON.stringify({ ...state, ...branchOverride }, null, 2)}`);
      this.callEventService.makeCallEventv2('hangup', linkedid, branchOverride);

      if (shouldSynthesizeMisscall(state, branchState, channel, branchKey, this.store.arrCompleteCall)) {
        this.store.arrCompleteCall[branchKey] = createSyntheticCdr(channel, getTimeFormat());
        branchState.status = 'misscall';
        this.logger.log(`hangup [EARLY CDR synthesis, misscall]: key=${branchKey}`);
        this.callEventService.makeCallEventv2('misscall', linkedid, branchState);
      }
    }
  }

  private onCdr(data: any) {
    const linkedid = this.store.uniqueidToLinkedid[data.uniqueid] || data.uniqueid;
    const state = this.store.arrDialState[linkedid];
    if (!state) return;

    if (!isValidCdrEvent(data)) return;
    const destchannel = data.destinationchannel;
    const legKey = buildBranchKey(linkedid, destchannel);

    if (this.store.arrCompleteCall[legKey]) {
      this.logger.debug(`cdr [SKIP, already processed]: ${legKey}`);
      return;
    }

    this.store.arrCompleteCall[legKey] = data;

    const branchState = this.store.arrBranchState[legKey];
    const eventType = data.disposition === 'ANSWERED' ? 'completed' : 'misscall';

    const branchOverride = resolveBranchOverride(branchState, destchannel, state, state.destination);
    branchOverride.status = eventType;
    branchOverride.disposition = data.disposition;

    this.logger.log(`cdr [${eventType}]: ${JSON.stringify({ ...state, ...branchOverride }, null, 2)}`);
    this.callEventService.makeCallEventv2(eventType, linkedid, branchOverride);
  }
}
