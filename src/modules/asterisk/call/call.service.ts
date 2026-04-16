import { Injectable, Logger } from '@nestjs/common';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';
import { getTimeFormat } from '../../../shared/helpers/helpers';
import { Click2CallDto } from './dto/click2call.dto';
import { TransferCallDto } from './dto/transfer-call.dto';
import { MuteCallDto } from './dto/mute-call.dto';
import { HoldCallDto } from './dto/hold-call.dto';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(private readonly asterisk: AsteriskService) {}

  private get ami() {
    return this.asterisk.getAmi();
  }

  // ── callService.js ────────────────────────────────────────────────────────

  async transferCall(params: TransferCallDto): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!params.extension || !params.channel || !params.destchannel) {
        return reject({ code: 500, message: 'cannot transfer' });
      }
      let data: any = {};
      if (params.type === 'inbound') {
        if (params.status === 'ringing') {
          data = {
            Action: 'Redirect',
            Channel: params.channel,
            Exten: params.extension,
            Context: 'ext-local',
            ExtraExten: params.extension,
            ExtraChannel: params.destchannel,
            ExtraContext: 'from-internal',
            ExtraPriority: 1,
          };
        } else if (params.status === 'answered') {
          data = {
            Action: 'Redirect',
            Channel: params.channel,
            ExtraChannel: params.destchannel,
            Exten: params.extension,
            ExtraExten: params.channel,
            Context: 'astercc-onhold',
            ExtraContext: 'astercc-onhold',
            ExtraPriority: 2,
          };
        }
      }
      this.ami.action(data, (err: any, rq: any) => {
        if (err) return reject({ code: 500, status: 'Error', message: rq && rq.message });
        if (rq.response === 'Error') return reject({ code: 400, status: 'Error', message: 'cannot transfer' });
        resolve({ code: 200, status: 'Success', message: 'transfer success' });
      });
    });
  }

  async muteCall(params: MuteCallDto): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!params.channel) return reject({ code: 500, status: 'Error', message: 'cannot mute' });
      this.ami.action(
        { Action: 'MuteAudio', Channel: params.channel, Direction: params.direction, State: params.state },
        (err: any, rq: any) => {
          if (err) return reject({ code: 500, status: 'Error', message: err });
          if (rq.response === 'Error') return reject({ code: 500, status: 'Error', message: 'cannot mute' });
          resolve({ code: 200, status: 'Success', message: 'mute success' });
        },
      );
    });
  }

  async hangupCall(channel: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ami.action({ action: 'hangup', channel }, (err: any, rq: any) => {
        if (err) return reject({ code: 500, status: 'Error', message: err });
        if (rq.response === 'Success') return resolve({ code: 200, status: 'Success', message: 'hangup success' });
        reject({ code: 400, status: 'Error', message: 'channel not valid' });
      });
    });
  }

  async holdCall(params: HoldCallDto): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!params.channel || !params.destchannel)
        return reject({ code: 500, status: 'Error', message: 'cannot hold' });

      let data: any;
      if (params.type === 'hold') {
        data = { Action: 'Redirect', Channel: params.destchannel, Exten: 's', Context: 'astercc-onhold', Priority: 1 };
      } else if (params.type === 'unhold') {
        data = { Action: 'Bridge', Channel1: params.channel, Channel2: params.destchannel };
      } else {
        return reject({ code: 500, status: 'Error', message: 'type must be hold or unhold' });
      }
      this.ami.action(data, (err: any) => {
        if (err) return reject({ code: 500, status: 'Error', message: err });
        resolve({ code: 200, status: 'Success', message: `${params.type} success` });
      });
    });
  }

  async click2call(data: Click2CallDto): Promise<any> {
    return new Promise((resolve, reject) => {
      const callInfo = {
        action: 'originate',
        channel: data.channel,
        context: data.context,
        callerid: '1' + data.callerid,
        exten: data.callerid,
        priority: 1,
        async: true,
        variable: '',
      };
      this.ami.action(callInfo, (err: any, response: any) => {
        if (err) {
          this.logger.error(`${getTimeFormat()} | Error Click2Call -->`, err);
          return reject(err);
        }
        this.logger.log(`${getTimeFormat()} | Success Click2Call --> ${data.channel} - ${data.callerid}`);
        resolve(response);
      });
    });
  }

  callActionInitUserConnect() {
    this.ami.action({ action: 'QueueSummary' }, () => {});
    this.ami.action({ action: 'QueueStatus' }, () => {});
    this.ami.action({ action: 'ExtensionStateList' }, () => {});
    this.ami.action({ action: 'CoreShowChannels' }, () => {});
  }

  callActionInitUserConnectv2() {
    this.ami.action({ action: 'QueueSummary' }, () => {});
    this.ami.action({ action: 'QueueStatus' }, () => {});
  }

  callActionUserStatus() {
    this.ami.action({ action: 'ExtensionStateList' }, () => {});
    this.ami.action({ action: 'CoreShowChannels' }, () => {});
  }
}
