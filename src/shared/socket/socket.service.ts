import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { StoreService } from '../store/store.service';
import { encodeDataToClient } from '../helpers/helpers';

@Injectable()
export class SocketService {
  private io: Server | null = null;

  constructor(private readonly store: StoreService) {}

  setIO(io: Server) {
    this.io = io;
  }

  getIO(): Server | null {
    return this.io;
  }

  /**
   * Emit to a specific user by their extension.
   */
  emitData(extension: string, data: any, type: string) {
    if (!this.io) return;
    Object.keys(this.store.listUserConnected).forEach((index) => {
      if (this.store.listUserConnected[index]['extension'] === extension) {
        this.io!.sockets.emit(type + this.store.listUserConnected[index]['accountId'], data);
      }
    });
  }

  /**
   * Emit to all users subscribed to a queue or extension.
   * @param event  - Socket event name
   * @param data   - Raw data (will be encoded)
   * @param type   - 'queues' | 'extensions'
   * @param check  - queue name or extension to match
   */
  emitData2(event: string, data: any, type: string, check?: string) {
    if (!this.io) return;
    for (const key in this.store.listUserConnected) {
      if (typeof check !== 'undefined') {
        if (
          this.store.listUserConnected[key][type] &&
          this.store.listUserConnected[key][type].indexOf(check) > -1
        ) {
          const socket = this.io.sockets.sockets.get(key);
          if (socket && typeof socket.emit === 'function' && typeof event !== 'undefined') {
            socket.emit(event, encodeDataToClient(data));
          }
        }
      }
    }
  }
}
