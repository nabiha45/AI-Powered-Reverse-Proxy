import { pool } from './database';

export type RuleDecision = {
  decision: 'allow' | 'block';
  source: 'rule';
  reason: string;
};

export async function findRule(ip: string): Promise<RuleDecision | null> {
  const allowed = await pool.query(
    'SELECT ip FROM allow_rules WHERE ip = $1',
    [ip],
  );

  if (allowed.rows.length > 0) {
    return {
      decision: 'allow',
      source: 'rule',
      reason: 'IP is on the manual allowlist',
    };
  }

  const blocked = await pool.query<{ reason: string }>(
    `SELECT reason FROM blocks
     WHERE ip = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [ip],
  );

  if (blocked.rows.length > 0) {
    return {
      decision: 'block',
      source: 'rule',
      reason: blocked.rows[0].reason,
    };
  }

  return null;
}