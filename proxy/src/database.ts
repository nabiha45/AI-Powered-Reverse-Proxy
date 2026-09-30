import { Pool } from 'pg';
import { config } from './config';
import { schemaSql } from './schema';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function initDatabase(): Promise<void> {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  await pool.query(schemaSql);
}