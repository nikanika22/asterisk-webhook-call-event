import { Module, Global } from '@nestjs/common';
import { AmiConnectionManager } from './ami-connection-manager.service';
import { AsteriskService } from './asterisk.service';

@Global()
@Module({
  providers: [AmiConnectionManager, AsteriskService],
  exports: [AmiConnectionManager, AsteriskService],
})
export class AsteriskModule {}
