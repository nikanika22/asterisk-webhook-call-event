import { plainToInstance } from 'class-transformer';
import { IsNumber, IsString, validateSync, IsOptional } from 'class-validator';
import { loadRuntimeConfig } from './runtime-config';

export class EnvironmentVariables {
  @IsString()
  DB_HOST!: string;

  @IsNumber()
  DB_PORT!: number;

  @IsString()
  DB_USER!: string;

  @IsString()
  @IsOptional()
  DB_PASS?: string;

  @IsString()
  DB_NAME!: string;

  @IsNumber()
  SOCKET_PORT!: number;
}

export function validate(config: Record<string, unknown>) {
  loadRuntimeConfig(config);

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  
  return validatedConfig;
}
