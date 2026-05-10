import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AsteriskService } from '../../core/asterisk/asterisk.service';
import { StoreService } from '../../shared/store/store.service';
import { encodeDataToClient } from '../../shared/helpers/helpers';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, pingTimeout: 60000, allowEIO3: true })
export class MonitorGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MonitorGateway.name);

  constructor(
    private readonly asteriskService: AsteriskService,
    private readonly store: StoreService,
  ) {}

  private get ami() {
    return this.asteriskService.getAmi();
  }

  private actionAMI(callInfo: any, data: any, userId: string, socket: Socket) {
    this.ami.action(callInfo, (err: any, res: any) => {
      if (res?.response === 'Error') return;
      this.logger.log(`actionAMI: ${JSON.stringify(res)}`);
    });
  }

  @SubscribeMessage('chanspy')
  handleChanSpy(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    if (!data.extension) return;
    const userInfo = this.store.listUserConnected[socket.id];
    if (!userInfo) return;
    const userId = userInfo.accountId || '';

    const callInfo = {
      action: 'originate',
      application: 'chanspy',
      context: 'default',
      callerid: data.extension,
      exten: data.extension,
      channel: `SIP/${data.extension}`,
      data: `SIP/${data.spyExten},qw`,
      priority: 1,
      async: true,
      timeout: 30000,
    };

    this.ami.action(callInfo, (err: any, res: any) => {
      if (res?.response === 'Error') {
        this.server.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: res.message }));
      }
    });
  }

  @SubscribeMessage('eavesDropCall')
  handleEavesDropCall(@MessageBody() data: any) {
    if (!data.extension) return;
    const callInfo = {
      action: 'originate',
      application: 'chanspy',
      context: 'default',
      callerid: data.extension,
      exten: data.extension,
      channel: `SIP/${data.extension}`,
      data: `SIP/${data.spyExten},q`,
      priority: 1,
      async: true,
      timeout: 30000,
    };
    this.ami.action(callInfo, (err: any, res: any) => {
      if (res?.response === 'Error') {
        this.logger.error('eavesdrop error: ' + res.message);
      }
    });
  }

  @SubscribeMessage('pauseAgent')
  handlePauseAgent(@MessageBody() data: any) {
    if (!data.channel || !data.queue) return;
    const pauseAction = {
      Action: 'QueuePause',
      Interface: data.channel,
      Paused: data.paused || false,
      Queue: data.queue,
    };
    this.ami.action(pauseAction, () => {});
  }

  @SubscribeMessage('monitorAction')
  handleMonitorAction(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const userInfo = this.store.listUserConnected[socket.id];
    if (!userInfo) return;
    const userId = userInfo.accountId || '';

    switch (data.type) {
      case 'hangupCall':
        this.actionAMI(data.callInfo, data, userId, socket);
        break;
      case 'chanspyCall': {
        const callInfo = {
          action: 'originate',
          application: 'chanspy',
          context: data.callInfo.context,
          callerid: `INVITE_SWP <0000${data.callInfo.spyExtension}>`,
          exten: data.callInfo.curExtension,
          channel: `Local/${data.callInfo.curExtension}@${data.callInfo.context}/n`,
          data: `SIP/${data.callInfo.spyExtension},qwE`,
          priority: 1,
          account: data.callInfo.account,
          async: true,
          timeout: 30000,
        };
        this.actionAMI(callInfo, data, userId, socket);
        break;
      }
      case 'eavesDropCall': {
        const callInfo = {
          action: 'originate',
          application: 'chanspy',
          context: data.callInfo.context,
          callerid: `INVITE_SPY <0000${data.callInfo.spyExtension}>`,
          exten: data.callInfo.curExtension,
          channel: `Local/${data.callInfo.curExtension}@${data.callInfo.context}/n`,
          data: `SIP/${data.callInfo.spyExtension},qE`,
          priority: 1,
          account: data.callInfo.account,
          async: true,
          timeout: 30000,
        };
        this.actionAMI(callInfo, data, userId, socket);
        break;
      }
      case 'meetMeCall': {
        const channel = `SIP/${data.callInfo.curExtension}`;
        const meetme = {
          action: 'originate',
          application: 'chanspy',
          context: data.callInfo.context,
          callerid: data.callInfo.curExtension,
          exten: data.callInfo.curExtension,
          channel,
          data: `SIP/${data.callInfo.spyExtension},qB`,
          priority: 1,
          async: true,
          timeout: 30000,
        };
        this.ami.action(meetme, (err: any, res: any) => {
          if (res?.response !== 'Error') {
            this.logger.log(`meetMeCall: ${JSON.stringify(res)}`);
          }
        });
        break;
      }
    }
  }
}
