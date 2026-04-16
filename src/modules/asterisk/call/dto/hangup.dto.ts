import { IsString } from 'class-validator';

export class HangupDto {
  @IsString()
  channel!: string;
}
