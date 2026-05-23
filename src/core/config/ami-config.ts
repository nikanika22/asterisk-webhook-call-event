import { Logger } from '@nestjs/common';

export interface AmiConnectionConfig {
  pbxId: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  connectorServer: string;
}

const logger = new Logger('AmiConfigLoader');

/**
 * Scan process.env for AMI_HOST_<nn> keys and build a validated list of
 * AMI connection configs. Each index nn corresponds to a PBX (e.g. "01", "02").
 *
 * Throws if no valid config is found so the app fails fast on misconfiguration.
 */
export function loadAmiConfigs(): AmiConnectionConfig[] {
  const AMI_HOST_PATTERN = /^AMI_HOST_(\d+)$/;
  const configs: AmiConnectionConfig[] = [];

  for (const key of Object.keys(process.env)) {
    const match = AMI_HOST_PATTERN.exec(key);
    if (!match) continue;

    const nn = match[1]; // e.g. "01", "02"
    const host = process.env[`AMI_HOST_${nn}`];
    const portStr = process.env[`AMI_PORT_${nn}`];
    const user = process.env[`AMI_USER_${nn}`];
    const pass = process.env[`AMI_PASS_${nn}`];
    const connectorServer = process.env[`AMI_ALIAS_${nn}`] || '';

    if (!host || !portStr || !user || !pass) {
      logger.warn(
        `[AmiConfig] PBX ${nn}: incomplete config — missing one of AMI_PORT_${nn}, AMI_USER_${nn}, AMI_PASS_${nn}. Skipping.`,
      );
      continue;
    }

    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
      logger.warn(`[AmiConfig] PBX ${nn}: AMI_PORT_${nn}="${portStr}" is not a valid number. Skipping.`);
      continue;
    }

    if (!connectorServer) {
      logger.warn(`[AmiConfig] PBX ${nn}: AMI_ALIAS_${nn} not set — webhook routing disabled for this PBX.`);
    }

    configs.push({ pbxId: nn, host, port, user, pass, connectorServer });
  }

  if (configs.length === 0) {
    throw new Error(
      '[AmiConfig] No valid AMI connection found. ' +
      'Define at least one set of AMI_HOST_01, AMI_PORT_01, AMI_USER_01, AMI_PASS_01 in your .env',
    );
  }

  logger.log(`[AmiConfig] Loaded ${configs.length} AMI connection(s): ${configs.map((c) => c.pbxId).join(', ')}`);
  return configs;
}
