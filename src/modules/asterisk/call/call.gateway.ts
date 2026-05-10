import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';
import { CallService } from './call.service';
import { StoreService } from '../../../shared/store/store.service';
import { SocketService } from '../../../shared/socket/socket.service';
import { encodeDataToClient } from '../../../shared/helpers/helpers';

@WebSocketGateway({ cors: { origin: '*' }, pingTimeout: 60000, allowEIO3: true })
export class CallGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly asteriskService: AsteriskService,
    private readonly callService: CallService,
    private readonly store: StoreService,
    private readonly socketService: SocketService,
  ) {}

  private get ami() {
    return this.asteriskService.getAmi();
  }

  afterInit(server: Server) {
    // Chỉ cần setIO 1 lần cho toàn bộ app
    if (!this.socketService.getIO()) {
      this.socketService.setIO(server);
    }
  }

  @SubscribeMessage('click2call')
  handleClick2Call(@MessageBody() req: any, @ConnectedSocket() socket: Socket) {
    const data = this.store.listUserConnected[socket.id];
    if (typeof data === 'undefined' || !this.store.listUserConnected) return;

    const called = req.called;
    const caller = data.extension || '';
    const channel = data.channelOut || '';
    const context = data.context || '';
    const userId = data.accountId || '';

    if (!caller || !called) {
      this.server.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: 'Empty caller or called.' }));
      return;
    }

    const callInfo = {
      action: 'originate',
      channel,
      context,
      callerid: caller,
      exten: called,
      priority: 1,
      async: true,
      variable: req.variables || {},
    };

    this.ami.action(callInfo, (err: any, res: any) => {
      if (err || res?.response === 'Error') {
        this.server.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: res?.message || err?.message }));
        return;
      }
      const mess = {
        type: 'recall',
        queuelog_misscall_id: req.id,
        userId: req.userId || '',
        userName: req.userName || '',
        groupId: data.groupId || '',
      };
      this.server.emit('updateRecall' + data.groupId, encodeDataToClient(mess));
    });
  }

  @SubscribeMessage('hangupCall')
  handleHangupCall(@MessageBody() req: any, @ConnectedSocket() socket: Socket) {
    const data = this.store.listUserConnected[socket.id];
    if (!data) return;
    const userId = data.accountId || '';
    const channel = req.channel || '';

    if (!channel) {
      this.server.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: 'Empty info, can not hangup.' }));
      return;
    }
    this.ami.action({ action: 'hangup', channel }, (err: any, res: any) => {
      if (res?.response === 'Error') {
        this.server.emit('messageBox' + userId, encodeDataToClient({ type: 'error', message: res.message }));
      }
    });
  }

  @SubscribeMessage('transferCall')
  handleTransferCall(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.ami.action(
      { Action: 'Redirect', Channel: data.channel, Exten: data.extension, Context: 'from-internal-xfer', Priority: 1 },
      (err: any, rq: any) => {
        if (rq?.response === 'Error' || err) {
          this.server.emit('messageBox' + data.userId, encodeDataToClient({ type: 'error', message: 'Cannot Transfer' }));
        } else {
          this.server.emit('messageBox' + data.userId, encodeDataToClient({ type: 'success', message: 'Transfer Success' }));
        }
      },
    );
  }

  @SubscribeMessage('reinitcall')
  handleReinitCall() {
    this.callService.callActionInitUserConnect();
  }

  @SubscribeMessage('initCallAction')
  handleInitCallAction() {
    this.callService.callActionInitUserConnect();
  }

  @SubscribeMessage('initCallActionStatus')
  handleInitCallActionStatus() {
    this.callService.callActionUserStatus();
  }

  @SubscribeMessage('reinitCoreShowChannel')
  handleReinitCoreShowChannel() {
    this.ami.action({ action: 'CoreShowChannels' }, () => {});
  }
}
