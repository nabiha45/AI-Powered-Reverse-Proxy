import type { Request } from 'express';
import { pool } from './database';
import type { RuleDecision } from './rules';

export async function countRecentRequests(ip: string): Promise<number> {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::integer AS count
     FROM request_logs
     WHERE ip = $1 AND created_at >= NOW() - INTERVAL '1 minute'`,
    [ip],
  );

  return result.rows[0].count;
}
export async function logRuleDecision(
  request: Request,
  requestId: string,
  clientIp: string,
  rule: RuleDecision,
  totalLatencyMs: number,
): Promise<void> {
  const questionMark = request.url.indexOf('?');
  const path =
    questionMark === -1 ? request.url : request.url.slice(0, questionMark);
  const queryString =
    questionMark === -1 ? '' : request.url.slice(questionMark);

  await pool.query(
    `INSERT INTO request_logs
      (id, ip, method, path, query_string, decision, source, reason, total_latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      requestId,
      clientIp,
      request.method,
      path,
      queryString,
      rule.decision,
      rule.source,
      rule.reason,
      totalLatencyMs,
    ],
  );
}