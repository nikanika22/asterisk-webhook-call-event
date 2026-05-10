import { Module } from '@nestjs/common';
import { QueueModule } from './queue-acd/queue.module';
import { CallModule } from './call/call.module';
import { ExtensionModule } from './extension/extension.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { AsteriskEventService } from './asterisk-events.service';

/**
 * AsteriskGroupModule — Feature Group tập hợp toàn bộ module Asterisk.
 * Kích hoạt AsteriskEventService để lắng nghe event AMI từ PBX.
 */
@Module({
  imports: [
    QueueModule,
    CallModule,
    ExtensionModule,
    BlacklistModule,
  ],
  providers: [AsteriskEventService],
})
export class AsteriskGroupModule {}
