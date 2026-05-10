import { Module, Global } from '@nestjs/common';
import { AsteriskService } from './asterisk.service';

@Global()
@Module({
  providers: [AsteriskService],
  exports: [AsteriskService],
})
export class AsteriskModule {}
