import { Module } from '@nestjs/common';
import { ExtensionService } from './extension.service';
import { ExtensionController } from './extension.controller';
import { ExtensionGateway } from './extension.gateway';
import { CallModule } from '../call/call.module';

@Module({
  imports: [CallModule],
  controllers: [ExtensionController],
  providers: [ExtensionService, ExtensionGateway],
  exports: [ExtensionService],
})
export class ExtensionModule {}
