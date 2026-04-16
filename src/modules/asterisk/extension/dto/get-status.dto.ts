import { IsString } from 'class-validator';

export class GetStatusDto {
  @IsString()
  extension!: string;
}
