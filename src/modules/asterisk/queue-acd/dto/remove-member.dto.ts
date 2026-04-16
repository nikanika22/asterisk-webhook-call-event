import { IsString, IsOptional } from 'class-validator';

export class RemoveMemberDto {
  @IsString()
  queue!: string;

  @IsString()
  extension!: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}
