import { Controller, Get } from '@nestjs/common';
import { pool } from './database';

type StatsRow = {
  total_requests: number;
  blocked_requests: number;
  ai_calls: number;
  average_ai_latency_ms: string | null;
};

@Controller('api/stats')
export class StatsController {
  @Get()
  async getStats() {
    const result = await pool.query<StatsRow>(
      `SELECT
         COUNT(*)::integer AS total_requests,
         (COUNT(*) FILTER (WHERE decision = 'block'))::integer
           AS blocked_requests,
         (COUNT(*) FILTER (WHERE source IN ('ai', 'fallback')))::integer
           AS ai_calls,
         AVG(ai_latency_ms) FILTER (
           WHERE source IN ('ai', 'fallback')
         ) AS average_ai_latency_ms
       FROM request_logs`,
    );

    const row = result.rows[0];

    return {
      totalRequests: row.total_requests,
      blockRate:
        row.total_requests === 0
          ? 0
          : Math.round((row.blocked_requests / row.total_requests) * 10000) /
            100,
      aiCalls: row.ai_calls,
      averageAiLatencyMs: Number(row.average_ai_latency_ms ?? 0),
    };
  }
}
