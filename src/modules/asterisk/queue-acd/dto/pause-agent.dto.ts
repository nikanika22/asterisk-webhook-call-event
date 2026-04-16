import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class PauseAgentDto {
  @IsString()
  queue!: string;

  @IsString()
  extension!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsBoolean()
  paused?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
