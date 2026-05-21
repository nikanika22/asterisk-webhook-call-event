import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { AmiConnectionManager } from "../../core/asterisk/ami-connection-manager.service";
import { StoreService } from "../../shared/store/store.service";
import { SocketService } from "../../shared/socket/socket.service";
import { CallEventService } from "./call/call-event.service";
import { WebhookService } from "../webhook/webhook.service";
import {
  encodeDataToClient,
  getTimeFormat,
  parseChannel,
} from "../../shared/helpers/helpers";
import { getRuntimeConfig } from "../../core/config/runtime-config";
import {
  backupStateAsync,
  restoreState,
  classifyCall,
  isValidChannelForWebhook,
  buildMasterState,
  buildBranchState,
  cleanupCallState,
  createSyntheticCdr,
  findWebhookByExtension,
  extractRecordingInfo,
  resolveBranchOverride,
  applyChannelStateUpdate,
  buildMasterHangupOverride,
  updateMasterWebhookIfMissing,
  buildBranchKey,
  buildExtensionStatusPayload,
  storeQueueCaller,
  applyAgentConnect,
  buildQueueSummaryWebhook,
  storeChanspy,
  removeChanspy,
  resolveRecordingKey,
  buildDeviceStateWebhook,
  isValidCdrEvent,
  handleNoAnsweredCalls,
  SOCKET_RELAY,
} from "../../shared/helpers/helperAsterisk";

@Injectable()
export class AsteriskEventService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AsteriskEventService.name);
  private readonly backFilePath = path.join(
    process.cwd(),
    "logs",
    "dial_statebackup.json",
  );

  constructor(
    private readonly amiManager: AmiConnectionManager,
    private readonly store: StoreService,
    private readonly socketService: SocketService,
    private readonly callEventService: CallEventService,
    private readonly webhookService: WebhookService,
  ) {}

  // Task 4.8 — restoreState is called once at bootstrap, before listeners attach
  onApplicationBootstrap() {
    restoreState(this.store, this.backFilePath, this.logger);
    this.attachListeners();
  }

  private backupStateAsync() {
    backupStateAsync(this.store, this.backFilePath, this.logger);
  }

  private logDetail(message: string) {
    if (getRuntimeConfig().logEnabled) this.logger.log(message);
  }

  private debugDetail(message: string) {
    if (getRuntimeConfig().logEnabled) this.logger.debug(message);
  }

  private attachListeners() {
    const io = () => this.socketService.getIO();

    SOCKET_RELAY.forEach(([event, socketEvent]) =>
      this.amiManager.onAll(event, (data) =>
        io()?.sockets.emit(socketEvent, encodeDataToClient(data)),
      ),
    );

    this.amiManager.onAll("extensionstatus", (data) => {
      io()?.sockets.emit(
        "deviceStatus",
        encodeDataToClient(buildExtensionStatusPayload(data)),
      );
    });

    this.amiManager.onAll("queuecallerjoin", (data, pbxId) => {
      storeQueueCaller(this.store, data, pbxId);
      io()?.sockets.emit("queuecallerjoin", encodeDataToClient(data));
    });

    this.amiManager.onAll("agentconnect", (data) => {
      io()?.sockets.emit("agentconnect", encodeDataToClient(data));
      applyAgentConnect(this.store, data);
    });

    this.amiManager.onAll("queuesummary", (data) => {
      io()?.sockets.emit("queueSummary", encodeDataToClient(data));
      for (const { url, params } of buildQueueSummaryWebhook(
        this.store.arrWebhook,
        data,
      )) {
        this.webhookService.sendPostRequestv2(url, params);
      }
    });

    this.amiManager.onAll("meetmejoin", (data) => {
      storeChanspy(this.store, data);
      io()?.sockets.emit("meetmejoin", encodeDataToClient(data));
    });

    this.amiManager.onAll("meetmeleave", (data) => {
      removeChanspy(this.store, data.uniqueid);
      io()?.sockets.emit("meetmeleave", encodeDataToClient(data));
    });

    this.amiManager.onAll("newexten", (data) => {
      const recordInfo = extractRecordingInfo(data);
      if (recordInfo) {
        this.store.arrRecordingFile[resolveRecordingKey(this.store, data)] =
          recordInfo;
      }
    });

    this.amiManager.onAll("devicestatechange", (data) => {
      for (const { url, params } of buildDeviceStateWebhook(
        this.store.arrWebhook,
        data,
      )) {
        this.webhookService.sendPostRequestv2(url, params);
      }
    });
    this.amiManager.onAll("dialbegin", (data, pbxId) =>
      this.onDialBegin(data, pbxId),
    );
    this.amiManager.onAll("dialend", (data, pbxId) =>
      this.onDialEnd(data, pbxId),
    );
    this.amiManager.onAll("dialstate", (data, pbxId) =>
      this.onDialState(data, pbxId),
    );
    this.amiManager.onAll("hangup", (data, pbxId) =>
      this.onHangup(data, pbxId),
    );
    this.amiManager.onAll("cdr", (data, pbxId) => this.onCdr(data, pbxId));
  }
  private onDialBegin(data: any, pbxId: string) {
    const rawLinkedid = data.linkedid;
    const linkedid = `${pbxId}::${rawLinkedid}`;

    this.store.uniqueidToLinkedid[`${pbxId}::${data.uniqueid}`] = linkedid;

    const destchannel = data.destchannel || "";
    const connectedlinenum = data.connectedlinenum || "";

    const channel = data.channel || "";
    const ext = parseChannel(channel) || "";
    const calleridnum = data.calleridnum || "";

    const { calltype, tonumber_val } = classifyCall(
      data,
      calleridnum,
      connectedlinenum,
      destchannel,
    );

    if (!isValidChannelForWebhook(channel, destchannel)) return;

    const webhook_select = findWebhookByExtension(
      this.webhookService.getWebhookMapForPbx(pbxId),
      ext,
    );

    const masterAlreadyExisted = !!this.store.arrDialState[linkedid];
    const isDestLocal = destchannel.toLowerCase().startsWith("local/");
    const branchKey = buildBranchKey(pbxId, rawLinkedid, destchannel);

    if (!masterAlreadyExisted) {
      this.store.arrDialState[linkedid] = buildMasterState(
        data,
        calleridnum,
        calltype,
        channel,
        destchannel,
        tonumber_val,
        linkedid,
        webhook_select,
        getTimeFormat(),
      );
      const queueInfo = this.store.arrQueue[linkedid];
      if (queueInfo?.queue) {
        this.store.arrDialState[linkedid].queue = queueInfo.queue;
      }
      this.logDetail(
        `dialbegin [MASTER CREATED]: ${JSON.stringify(this.store.arrDialState[linkedid], null, 2)}`,
      );
      this.backupStateAsync();
    } else if (!isDestLocal) {
      updateMasterWebhookIfMissing(
        this.store.arrDialState[linkedid],
        webhook_select,
      );
      this.store.arrDialState[linkedid].isMultiBranch = true;

      const master = this.store.arrDialState[linkedid];
      this.store.arrBranchState[branchKey] = buildBranchState(
        master,
        calleridnum,
        destchannel,
        tonumber_val,
        linkedid,
        getTimeFormat(),
      );
      this.logDetail(
        `dialbegin [BRANCH CREATED]: key=${branchKey}, branch=${JSON.stringify(this.store.arrBranchState[branchKey], null, 2)}`,
      );
      this.backupStateAsync();
    }
    if (isDestLocal) {
      this.backupStateAsync();
      this.logDetail(
        `dialbegin [OUTER, master=${masterAlreadyExisted ? "existed" : "created"}]: ${JSON.stringify(this.store.arrDialState[linkedid], null, 2)}`,
      );
      return;
    }

    if (this.store.arrDialState[linkedid].webhookurl) {
      const branch = masterAlreadyExisted
        ? this.store.arrBranchState[branchKey]
        : undefined;
      this.callEventService.makeCallEventv2("ringing", linkedid, branch);
    }
  }

  private onDialEnd(data: any, pbxId: string) {
    const linkedid = `${pbxId}::${data.linkedid}`;
    const state = this.store.arrDialState[linkedid];
    if (!state) return;
    const destchannel = data.destchannel || "";

    if (destchannel.toLowerCase().startsWith("local/")) return;

    if (data.dialstatus === "ANSWER") {
      applyChannelStateUpdate(state, destchannel, data, "answered");
      this.logDetail(`dialend [ANSWER]: ${JSON.stringify(state, null, 2)}`);
      this.callEventService.makeCallEventv2("answered", linkedid);
      this.backupStateAsync();
    }
  }

  private onDialState(data: any, pbxId: string) {
    const linkedid = `${pbxId}::${data.linkedid}`;
    const state = this.store.arrDialState[linkedid];
    if (!state) return;
    const destchannel = data.destchannel || "";

    if (destchannel.toLowerCase().startsWith("local/")) return;

    if (
      [
        "RINGING",
        "NOANSWER",
        "CONGESTION",
        "CANCELLED",
        "PROGRESS",
        "BUSY",
      ].includes(data.dialstatus)
    ) {
      const lowerState = data.dialstatus.toLowerCase();
      const branchKey = buildBranchKey(pbxId, data.linkedid, destchannel);
      const branchState = this.store.arrBranchState[branchKey];

      if (branchState) {
        branchState.status = lowerState;
        this.logDetail(
          `dialstate [${data.dialstatus}]: key=${branchKey}, status=${lowerState}`,
        );
      } else {
        applyChannelStateUpdate(state, destchannel, data, lowerState);
        this.logDetail(
          `dialstate [${data.dialstatus}]: ${JSON.stringify(state, null, 2)}`,
        );
        this.backupStateAsync();
      }
    }
  }

  private onHangup(data: any, pbxId: string) {
    const linkedid = `${pbxId}::${data.linkedid}`;
    const state = this.store.arrDialState[linkedid];
    if (!state) return;

    const isMaster = data.uniqueid === data.linkedid;
    const channel = data.channel || "";
    const isLocalChannel = channel.toLowerCase().startsWith("local/");

    if (isLocalChannel) {
      this.debugDetail(`hangup [LOCAL channel ignored=${channel}]`);
      return;
    }

    if (isMaster) {
      const wasAnswered = state.status === "answered";
      state.status = "hangup";

      const masterOverride = buildMasterHangupOverride(
        state,
        data,
        wasAnswered,
      );

      this.logDetail(
        `hangup [MASTER, channel=${channel}]: ${JSON.stringify({ ...state, ...masterOverride }, null, 2)}`,
      );
      this.callEventService.makeCallEventv2("hangup", linkedid, masterOverride);

      setTimeout(() => {
        cleanupCallState(this.store, pbxId, data.linkedid, this.backFilePath);
        this.backupStateAsync();
      }, getRuntimeConfig().setTimeoutMs);
    } else {
      const branchKey = buildBranchKey(pbxId, data.linkedid, channel);
      const branchState = this.store.arrBranchState[branchKey];

      const branchOverride = resolveBranchOverride(
        branchState,
        channel,
        state,
        state.destination,
      );
      branchOverride.status = "hangup";

      this.logDetail(
        `hangup [branch, channel=${channel}]: ${JSON.stringify({ ...state, ...branchOverride }, null, 2)}`,
      );
      this.callEventService.makeCallEventv2("hangup", linkedid, branchOverride);

      if (
        handleNoAnsweredCalls(
          state,
          branchState,
          channel,
          branchKey,
          this.store.arrCompleteCall,
        )
      ) {
        this.store.arrCompleteCall[branchKey] = createSyntheticCdr(
          channel,
          getTimeFormat(),
        );
        branchState.status = "misscall";
        this.logDetail(
          `hangup [EARLY CDR synthesis, misscall]: key=${branchKey}`,
        );
        this.callEventService.makeCallEventv2(
          "misscall",
          linkedid,
          branchState,
        );
      }
    }
  }

  // Task 4.7 — uniqueidToLinkedid lookup uses pbxId:: namespaced key
  private onCdr(data: any, pbxId: string) {
    const cdrUniqueKey = `${pbxId}::${data.uniqueid}`;
    const linkedid =
      this.store.uniqueidToLinkedid[cdrUniqueKey] ||
      `${pbxId}::${data.uniqueid}`;
    const state = this.store.arrDialState[linkedid];
    if (!state) return;

    if (!isValidCdrEvent(data)) return;
    const destchannel = data.destinationchannel;

    // rawLinkedid is extracted from the namespaced key for buildBranchKey
    const rawLinkedid = linkedid.startsWith(`${pbxId}::`)
      ? linkedid.slice(pbxId.length + 2)
      : linkedid;
    const legKey = buildBranchKey(pbxId, rawLinkedid, destchannel);

    if (this.store.arrCompleteCall[legKey]) {
      this.debugDetail(`cdr [SKIP, already processed]: ${legKey}`);
      return;
    }

    this.store.arrCompleteCall[legKey] = data;

    const branchState = this.store.arrBranchState[legKey];
    const eventType =
      data.disposition === "ANSWERED" ? "completed" : "misscall";

    const branchOverride = resolveBranchOverride(
      branchState,
      destchannel,
      state,
      state.destination,
    );
    branchOverride.status = eventType;
    branchOverride.disposition = data.disposition;

    this.logDetail(
      `cdr [${eventType}]: ${JSON.stringify({ ...state, ...branchOverride }, null, 2)}`,
    );
    this.callEventService.makeCallEventv2(eventType, linkedid, branchOverride);
  }
}
