import { IsString, IsOptional } from 'class-validator';

export class HoldCallDto {
  @IsString()
  channel!: string;

  @IsString()
  destchannel!: string;

  @IsString()
  type!: string; // 'hold' | 'unhold'
}
