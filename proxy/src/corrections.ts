import { pool } from './database';
import type { RequestSummary } from './ai/provider';

export type CorrectionExample = {
  summary: RequestSummary;
  originalDecision: 'allow' | 'block';
  correctedDecision: 'allow' | 'block';
  reason: string;
};

type CorrectionRow = {
  summary: RequestSummary;
  original_decision: 'allow' | 'block';
  corrected_decision: 'allow' | 'block';
  reason: string;
};

export async function getRecentCorrections(): Promise<CorrectionExample[]> {
  const result = await pool.query<CorrectionRow>(
    `SELECT r.summary,
            r.decision AS original_decision,
            c.corrected_decision,
            c.reason
     FROM corrections c
     JOIN request_logs r ON r.id = c.request_id
     WHERE r.source = 'ai' AND r.summary IS NOT NULL
     ORDER BY c.created_at DESC, c.request_id DESC
     LIMIT 3`,
  );

  return result.rows.map((row) => ({
    summary: row.summary,
    originalDecision: row.original_decision,
    correctedDecision: row.corrected_decision,
    reason: row.reason,
  }));
}
