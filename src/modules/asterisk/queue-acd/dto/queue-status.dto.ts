import { IsArray, IsString } from 'class-validator';

export class QueueStatusDto {
  @IsArray()
  @IsString({ each: true })
  queues!: string[];
}
