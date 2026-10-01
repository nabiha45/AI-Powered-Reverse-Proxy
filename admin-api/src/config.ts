const adminPort = Number(process.env.ADMIN_PORT ?? 9090);
if (!Number.isInteger(adminPort) || adminPort < 1 || adminPort > 65535) {
  throw new Error('ADMIN_PORT must be a valid port');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const adminToken = process.env.ADMIN_TOKEN;
if (!adminToken?.trim()) {
  throw new Error('ADMIN_TOKEN is required');
}
const aiTimeoutMs = Number(process.env.AI_TIMEOUT_MS ?? 2000);
if (!Number.isSafeInteger(aiTimeoutMs) || aiTimeoutMs <= 0) {
  throw new Error('AI_TIMEOUT_MS must be a positive integer');
}
export const config = {
  adminPort,
  adminToken,
  databaseUrl,
  aiProvider: process.env.AI_PROVIDER ?? 'mock',
  aiTimeoutMs,
};
