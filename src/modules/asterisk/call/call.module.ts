import { Module } from '@nestjs/common';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { CallEventService } from './call-event.service';
import { CallGateway } from './call.gateway';

@Module({
  controllers: [CallController],
  providers: [CallService, CallEventService, CallGateway],
  exports: [CallService, CallEventService],
})
export class CallModule {}
