import { Global, Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { StoreService } from '../store/store.service';

@Global()
@Module({
  providers: [StoreService, SocketService],
  exports: [StoreService, SocketService],
})
export class SocketModule {}
