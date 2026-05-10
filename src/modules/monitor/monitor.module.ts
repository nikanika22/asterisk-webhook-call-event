import { Module } from '@nestjs/common';
import { MonitorGateway } from './monitor.gateway';

@Module({
  providers: [MonitorGateway],
})
export class MonitorModule {}
