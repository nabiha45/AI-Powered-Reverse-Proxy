import { pool } from './database';

export async function createAutoBlockIfNeeded(
  ip: string,
  threshold: number,
  windowMin: number,
  durationMin: number,
): Promise<void> {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::integer AS count
     FROM request_logs
     WHERE ip = $1
       AND source = 'ai'
       AND decision = 'block'
       AND created_at >= NOW() - ($2::integer * INTERVAL '1 minute')`,
    [ip, windowMin],
  );

  if (result.rows[0].count < threshold) {
    return;
  }

  const reason = `Automatic block after ${threshold} AI blocks in ${windowMin} minutes`;

  await pool.query(
    `INSERT INTO blocks (ip, source, reason, expires_at)
     VALUES ($1, 'auto', $2, NOW() + ($3::integer * INTERVAL '1 minute'))
     ON CONFLICT (ip) DO UPDATE
     SET reason = EXCLUDED.reason,
         created_at = NOW(),
         expires_at = EXCLUDED.expires_at
     WHERE blocks.source = 'auto'`,
    [ip, reason, durationMin],
  );
}