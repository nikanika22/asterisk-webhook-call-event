import { Injectable } from '@nestjs/common';
import { StoreService } from '../../../shared/store/store.service';
import { SocketService } from '../../../shared/socket/socket.service';
import { WebhookService } from '../../webhook/webhook.service';
import { encodeDataToClient, encodeDataToBase, getTimeFormat, getDurationTime } from '../../../shared/helpers/helpers';

@Injectable()
export class CallEventService {
  constructor(
    private readonly store: StoreService,
    private readonly socketService: SocketService,
    private readonly webhookService: WebhookService,
  ) {}

  makeCallEvent(type: string, callid: string) {
    if (!this.store.arrDialState[callid]) return;
    const params: any = {
      object: 'call',
      event: type,
      value: {},
    };
    const data = JSON.parse(JSON.stringify(this.store.arrDialState[callid]));
    params.value = data;

    switch (type) {
      case 'answered':
        data.status = 'answered';
        data.answertime = getTimeFormat();
        this.store.arrDialState[callid].answertime = getTimeFormat();
        this.store.arrDialState[callid].status = 'answered';
        break;
      case 'hangup':
        data.endtime = getTimeFormat();
        params.value.endtime = getTimeFormat();
        this.store.arrDialState[callid].endtime = params.value.endtime;
        params.value.duration = getDurationTime(getTimeFormat(), this.store.arrDialState[callid].starttime);
        params.value.billsec =
          data.status === 'answered'
            ? getDurationTime(getTimeFormat(), this.store.arrDialState[callid].answertime)
            : 0;
        break;
      case 'cdr':
        if (data.status === 'answered') {
          params.event = 'completed';
          params.value.duration = this.store.arrCompleteCall[callid].duration;
          params.value.billsec = this.store.arrCompleteCall[callid].billableseconds;
          params.value.recording_file = '';
          if (this.store.arrRecordingFile[callid]) {
            const recFile = this.store.arrRecordingFile[callid].recordingfile.substr(1);
            params.value.recording_file = data.recordingurl + 'cvf.php?f=' + encodeDataToBase(recFile);
          } else if (this.store.arrRecordingFile[this.store.arrDialState[callid].destlinkedid]) {
            const recFile = this.store.arrRecordingFile[this.store.arrDialState[callid].destlinkedid].recordingfile.substr(1);
            params.value.recording_file = data.recordingurl + 'cvf.php?f=' + encodeDataToBase(recFile);
          }
        } else {
          params.event = 'misscall';
          params.value.recording_file = '';
          params.value.duration = this.store.arrCompleteCall[callid].duration;
          params.value.billsec = '0';
        }
        break;
    }

    delete params.value.webhookurl;
    delete params.value.recordingurl;
    if (params.value.calltype === 'Local') return;

    if (params.event === 'completed' || params.event === 'misscall') {
      setTimeout(() => {
        this.store.flagEvent[params.value.callrefid] = true;
      }, 1000);
    }
    
    if (this.socketService.getIO()) {
      this.socketService.getIO()!.sockets.emit('callEvent', encodeDataToClient(params));
    }
  }

  makeCallEventv2(type: string, callid: string) {
    if (!this.store.arrDialState[callid]) return;
    const params: any = {
      object: 'call',
      event: type,
      value: {},
    };
    const data = JSON.parse(JSON.stringify(this.store.arrDialState[callid]));
    params.value = data;

    switch (type) {
      case 'answered':
        data.status = 'answered';
        data.answertime = getTimeFormat();
        this.store.arrDialState[callid].answertime = getTimeFormat();
        this.store.arrDialState[callid].status = 'answered';
        break;
      case 'hangup':
        data.endtime = getTimeFormat();
        params.value.endtime = getTimeFormat();
        params.value.duration = getDurationTime(getTimeFormat(), this.store.arrDialState[callid].starttime);
        params.value.billsec =
          data.status === 'answered'
            ? getDurationTime(getTimeFormat(), this.store.arrDialState[callid].answertime)
            : 0;
        break;
      case 'cdr':
        if (data.status === 'answered') {
          params.event = 'completed';
          params.value.duration = this.store.arrCompleteCall[callid].duration;
          params.value.billsec = this.store.arrCompleteCall[callid].billableseconds;
          params.value.recording_file = '';
        } else {
          params.event = 'misscall';
          params.value.recording_file = '';
          params.value.duration = this.store.arrCompleteCall[callid].duration;
          params.value.billsec = '0';
        }
        break;
    }

    const url = params.value.webhookurl;
    delete params.value.webhookurl;
    delete params.value.recordingurl;

    if (type === 'cdr') {
      setTimeout(() => {
        this.webhookService.sendWebhook(url, params);
      }, 2000);
    } else {
      this.webhookService.sendWebhook(url, params);
    }
  }
}
