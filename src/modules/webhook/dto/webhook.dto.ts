import { IsNumber, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RetryWebhookDto {
  @IsNumber()
  @IsNotEmpty()
  id!: number;
}

export class RestartWebhookDto {
  @IsString()
  @IsNotEmpty()
  secret!: string;
}
