import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AsteriskService } from '../../../core/asterisk/asterisk.service';
import { StoreService } from '../../../shared/store/store.service';
import { encodeDataToClient, getTimeFormat } from '../../../shared/helpers/helpers';

@WebSocketGateway({ cors: { origin: '*' }, pingTimeout: 60000, allowEIO3: true })
export class QueueGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly asteriskService: AsteriskService,
    private readonly store: StoreService,
  ) {}

  private get ami() {
    return this.asteriskService.getAmi();
  }

  @SubscribeMessage('loginQueue')
  handleLoginQueue(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.ami.action(
      {
        action: 'MenuQueueAdd',
        queue: data.queue,
        interface: `Local/${data.agentId}@agentqueue/n`,
        membername: data.agentId,
        stateinterface: `hint:${data.extension}@ext-local`,
      },
      (err: any, rq: any) => {
        if (err) {
          this.server.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err.message }));
          return;
        }
        this.ami.action(
          { action: 'command', command: `DATABASE PUT agentqueue ${data.agentId} SIP/${data.extension}` },
          (err3: any, rq3: any) => {
            if (err3) {
              this.server.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err3.message }));
              return;
            }
            this.server.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'success', message: rq3.message }));
          },
        );
      },
    );
  }

  @SubscribeMessage('logoutQueue')
  handleLogoutQueue(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.ami.action(
      { action: 'QueueRemove', queue: data.queue, interface: `Local/${data.agentId}@agentqueue/n` },
      (err: any, rq: any) => {
        if (err) {
          this.server.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err.message }));
          return;
        }
        this.server.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'success', message: rq.message }));
      },
    );
  }

  @SubscribeMessage('pauseQueue')
  handlePauseQueue(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    if (!data.paused) data.paused = false;
    const pauseAction = {
      action: 'queuepause',
      paused: data.paused,
      queue: data.queue,
      interface: `Local/${data.agentId}@agentqueue/n`,
      membername: data.agentId,
      stateinterface: `hint:${data.extension}@ext-local`,
      reason: data.reason || 'ACW',
    };
    this.ami.action(pauseAction, (err: any, rq: any) => {
      if (err) {
        this.server.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'error', message: err.message }));
        return;
      }
      this.server.emit('messageBox' + data.agentId, encodeDataToClient({ type: 'success', message: rq.message }));
    });
  }

  @SubscribeMessage('loginQueuev2')
  handleLoginQueuev2(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const userInfo = this.store.listUserConnected[socket.id];
    if (!userInfo || !userInfo.channel) return;
    this.ami.action(
      {
        action: 'queueadd',
        interface: userInfo.channel,
        queue: data.queue,
        membername: userInfo.agentName,
        stateinterface: `hint:${userInfo.extension}@ext-local`,
      },
      (errA: any, resA: any) => {
        if (resA?.response === 'Success') {
          this.ami.action(
            { action: 'queuelog', interface: userInfo.channel, queue: data.queue, event: 'AGENTLOGIN', message: userInfo.extension },
            () => {},
          );
        }
      },
    );
  }

  @SubscribeMessage('loginQueuev3')
  handleLoginQueuev3(@MessageBody() data: any) {
    const channel = `Local/${data.extension}@from-queue/n`;
    this.ami.action(
      { action: 'queueadd', interface: channel, queue: data.queue, membername: data.extension, stateinterface: `hint:${data.extension}@ext-local` },
      (errA: any, resA: any) => {
        if (resA?.response === 'Success') {
          this.ami.action({ action: 'queuelog', interface: channel, queue: data.queue, event: 'AGENTLOGIN', message: data.extension }, () => {});
        }
      },
    );
  }

  @SubscribeMessage('logoutQueuev2')
  handleLogoutQueuev2(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    let channel: string;
    if (data.extension) {
      channel = `Local/${data.extension}@from-queue/n`;
    } else {
      const userInfo = this.store.listUserConnected[socket.id];
      if (!userInfo || !userInfo.channel) return;
      channel = userInfo.channel;
    }
    this.ami.action({ action: 'queueremove', interface: channel, queue: data.queue }, () => {});
  }

  @SubscribeMessage('pauseQueuev2')
  handlePauseQueuev2(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    if (data.extension) {
      const channel = `Local/${data.extension}@from-queue/n`;
      const actionType = data.paused ? 'pause' : 'unpause';
      const command = `queue ${actionType} member ${channel} queue ${data.queue} reason "ACW"`;
      this.ami.action({ action: 'command', command }, () => {});
    } else {
      const userInfo = this.store.listUserConnected[socket.id];
      if (!userInfo || !userInfo.channel) return;
      const command = `queue ${data.actionType} member ${userInfo.channel} queue ${data.queue} reason "${data.reason}"`;
      this.ami.action({ action: 'command', command }, () => {});
    }
  }

  @SubscribeMessage('reloadQueuev2')
  handleReloadQueuev2() {
    this.ami.action({ action: 'QueueSummary' }, () => {});
    this.ami.action({ action: 'QueueStatus' }, () => {});
  }

  @SubscribeMessage('loginQueueWithAgentId')
  handleLoginQueueWithAgentId(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const userInfo = this.store.listUserConnected[socket.id];
    if (!userInfo || !userInfo.channel) return;
    const channel = `Local/${userInfo.agentId}@agentqueue/n`;
    this.ami.action(
      { action: 'queueadd', interface: channel, queue: data.queue, membername: userInfo.agentId, stateinterface: `hint:${userInfo.extension}@ext-local` },
      (errA: any, resA: any) => {
        if (resA?.response === 'Success') {
          this.ami.action(
            { action: 'queuelog', interface: channel, queue: data.queue, event: 'AGENTLOGIN', message: userInfo.extension },
            (errB: any, resB: any) => {
              if (resB?.response === 'Success') {
                this.ami.action({ action: 'command', command: `DATABASE PUT agentqueue ${userInfo.agentId} SIP/${userInfo.extension}` }, () => {});
              }
            },
          );
        }
      },
    );
  }

  @SubscribeMessage('addMemberToQueue')
  handleAddMemberToQueue(@MessageBody() data: any) {
    if ((!data.queue && !data.extension) || data.queue === '' || data.extension === '') return;
    this.ami.action(
      { action: 'QueueAdd', Queue: data.queue, Interface: `Local/${data.extension}@from-queue/n`, Penalty: data.penalty || 0 },
      () => {
        this.server.emit('addMemberToQueue', encodeDataToClient(data));
      },
    );
  }

  @SubscribeMessage('removeMemberInQueue')
  handleRemoveMemberInQueue(@MessageBody() data: any) {
    if ((!data.queue && !data.extension) || data.queue === '' || data.extension === '') return;
    this.ami.action(
      { action: 'QueueRemove', Queue: data.queue, Interface: `Local/${data.extension}@from-queue/n` },
      () => {
        this.server.emit('removeMemberInQueue', encodeDataToClient(data));
      },
    );
  }

  @SubscribeMessage('updateMisscall')
  handleUpdateMisscall(@MessageBody() data: any) {
    this.server.emit('updateRecall' + data.groupId, encodeDataToClient({ ...data }));
  }
}
