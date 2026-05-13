export interface RuntimeConfig {
  maxRetry: number;
  retryDelayMs: number;
  setTimeoutMs: number;
  logEnabled: boolean;
}

let cachedRuntimeConfig: RuntimeConfig | null = null;

function required(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`[RuntimeConfig] Missing required environment variable: ${key}`);
  }
  return String(value).trim();
}

function numberEnv(env: Record<string, unknown>, key: string): number {
  const raw = required(env, key);
  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[RuntimeConfig] Invalid ${key}: expected a non-negative integer, received "${raw}"`);
  }

  return value;
}

function booleanEnv(env: Record<string, unknown>, key: string): boolean {
  const raw = required(env, key).toLowerCase();

  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;

  throw new Error(`[RuntimeConfig] Invalid ${key}: expected true, false, 1, or 0, received "${raw}"`);
}

export function loadRuntimeConfig(env: Record<string, unknown> = process.env): RuntimeConfig {
  return {
    maxRetry: numberEnv(env, 'RUNTIME_MAX_RETRY'),
    retryDelayMs: numberEnv(env, 'RUNTIME_RETRY_DELAY_MS'),
    setTimeoutMs: numberEnv(env, 'RUNTIME_SETTIMEOUT_MS'),
    logEnabled: booleanEnv(env, 'LOG_ENABLED'),
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!cachedRuntimeConfig) {
    cachedRuntimeConfig = loadRuntimeConfig();
  }
  return cachedRuntimeConfig;
}

export function resetRuntimeConfigForTest(): void {
  cachedRuntimeConfig = null;
}
