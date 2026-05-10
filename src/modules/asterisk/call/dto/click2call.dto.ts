import { IsString, IsOptional } from 'class-validator';

export class Click2CallDto {
  @IsString()
  channel!: string;

  @IsString()
  callerid!: string;

  @IsString()
  context!: string;
}
