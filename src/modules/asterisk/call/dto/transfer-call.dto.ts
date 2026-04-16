import { IsString, IsOptional } from 'class-validator';

export class TransferCallDto {
  @IsString()
  extension!: string;

  @IsString()
  channel!: string;

  @IsString()
  destchannel!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
