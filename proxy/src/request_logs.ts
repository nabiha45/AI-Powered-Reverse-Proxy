import type { Request } from 'express';
import { pool } from './database';
import type { RuleDecision } from './rules';
import type { AiDecision } from './ai/decision';
import type { RequestSummary } from './ai/provider';

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

export async function logAiDecision(
  requestId: string,
  summary: RequestSummary,
  decision: AiDecision,
  totalLatencyMs: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO request_logs
      (id, ip, method, path, query_string, decision, source,
       confidence, category, reason, suspicious, ai_latency_ms,
       total_latency_ms, summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
             $8, $9, $10, $11, $12, $13, $14)`,
    [
      requestId,
      summary.clientIp,
      summary.method,
      summary.path,
      summary.query ? `?${summary.query}` : '',
      decision.decision,
      decision.source,
      decision.confidence,
      decision.category,
      decision.reason,
      decision.suspicious,
      decision.aiLatencyMs,
      totalLatencyMs,
      JSON.stringify(summary),
    ],
  );
}