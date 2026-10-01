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

export const config = {
  adminPort,
  adminToken,
  databaseUrl,
};
