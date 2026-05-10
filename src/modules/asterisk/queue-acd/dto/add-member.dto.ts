import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AddMemberDto {
  @IsString()
  queue!: string;

  @IsString()
  extension!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsNumber()
  penalty?: number;
}
