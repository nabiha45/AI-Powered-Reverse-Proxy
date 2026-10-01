function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number`);
  }

  return value;
}
const failMode = process.env.FAIL_MODE ?? 'open';
if (failMode !== 'open' && failMode !== 'closed') {
  throw new Error('FAIL_MODE must be open or closed');
}

const aiTimeoutMs = numberEnv('AI_TIMEOUT_MS', 2000);
if (aiTimeoutMs <= 0) {
  throw new Error('AI_TIMEOUT_MS must be greater than zero');
}

const blockConfidence = numberEnv('BLOCK_CONFIDENCE', 0.7);
if (blockConfidence < 0 || blockConfidence > 1) {
  throw new Error('BLOCK_CONFIDENCE must be between 0 and 1');
}

export const config = {
  upstreamUrl: process.env.UPSTREAM_URL ?? 'http://upstream:3000',
  proxyPort: numberEnv('PROXY_PORT', 8080),
  upstreamTimeoutMs: 5000,
  databaseUrl: process.env.DATABASE_URL,
  adminPort: numberEnv('ADMIN_PORT', 9090),
  adminToken: process.env.ADMIN_TOKEN,
  aiProvider: process.env.AI_PROVIDER ?? 'mock',
  autoBlockThreshold: numberEnv('AUTO_BLOCK_THRESHOLD', 5),
  autoBlockWindowMin: numberEnv('AUTO_BLOCK_WINDOW_MIN', 10),
  blockDurationMin: numberEnv('BLOCK_DURATION_MIN', 30),
  aiTimeoutMs,
  failMode,
  blockConfidence,
};
