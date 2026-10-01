function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number`);
  }

  return value;
}
function positiveIntegerEnv(name: string, fallback: number): number {
  const value = numberEnv(name, fallback);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}
function readFailMode(): 'open' | 'closed' {
  const value = process.env.FAIL_MODE ?? 'open';

  if (value !== 'open' && value !== 'closed') {
    throw new Error('FAIL_MODE must be open or closed');
  }

  return value;
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
  aiTimeoutMs,
  failMode: readFailMode(),
  blockConfidence,
  autoBlockThreshold: positiveIntegerEnv('AUTO_BLOCK_THRESHOLD', 5),
  autoBlockWindowMin: positiveIntegerEnv('AUTO_BLOCK_WINDOW_MIN', 10),
  blockDurationMin: positiveIntegerEnv('BLOCK_DURATION_MIN', 30),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
};
