import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';
import { StoreService } from '../../../shared/store/store.service';
import { CallService } from '../call/call.service';
import { encodeDataToClient, getTimeFormat } from '../../../shared/helpers/helpers';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, pingTimeout: 60000, allowEIO3: true })
export class ExtensionGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ExtensionGateway.name);

  constructor(
    private readonly asteriskService: AsteriskService,
    private readonly store: StoreService,
    private readonly callService: CallService,
  ) {}

  private get ami() {
    return this.asteriskService.getAmi();
  }

  handleDisconnect(socket: Socket) {
    if (this.store.listUserConnected[socket.id]) {
      this.logger.log(`User disconnect - ${socket.id}`);
      delete this.store.listUserConnected[socket.id];
    }
  }

  @SubscribeMessage('userConnect')
  handleUserConnect(@MessageBody() clientConnect: any, @ConnectedSocket() socket: Socket) {
    if (typeof clientConnect.accountId === 'undefined') return;
    clientConnect.socketId = socket.id;

    if (clientConnect.extension) {
      this.logger.log(`${getTimeFormat()} | Extension ${clientConnect.extension} connected`);
      clientConnect.channel = `Local/${clientConnect.extension}@from-queue/n`;
      setTimeout(() => {
        this.ami.action({ action: 'ExtensionState', exten: clientConnect.extension, Context: 'ext-local' }, (err: any, res: any) => {
          if (res?.response === 'Success') {
            const outputParams = {
              Exten: clientConnect.extension,
              StatusText: res.statustext,
              Channel: res.hint.split(',')[0],
              Status: res.status,
            };
            this.server.emit('deviceStatus', encodeDataToClient(outputParams));
          }
        });
      }, 1000);
    }

    if (clientConnect.queues) {
      this.callService.callActionInitUserConnectv2();
    }
    if (!this.store.listUserConnected[socket.id]) {
      this.store.listUserConnected[socket.id] = clientConnect;
    }
  }

  @SubscribeMessage('getStatusExtension')
  handleGetStatusExtension(@MessageBody() req: any) {
    this.ami.action({ action: 'ExtensionState', exten: req.extension, Context: 'ext-local' }, (err: any, res: any) => {
      if (res?.response === 'Success') {
        const outputParams = {
          Exten: req.extension,
          StatusText: res.statustext,
          Channel: res.hint.split(',')[0],
          Status: res.status,
        };
        this.server.emit('deviceStatus', encodeDataToClient(outputParams));
      }
    });
  }

  @SubscribeMessage('actionPeerStatus')
  handleActionPeerStatus() {
    this.ami.action({ action: 'SIPpeers' }, () => {});
  }
}
