import { IsString, IsOptional } from 'class-validator';

export class MuteCallDto {
  @IsString()
  channel!: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
