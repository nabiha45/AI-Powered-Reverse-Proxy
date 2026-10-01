import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { pool } from './database';

@Controller('api/requests')
export class RequestsController {
  @Get()
  async list(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('decision') decision?: string,
    @Query('source') source?: string,
    @Query('ip') ip?: string,
  ) {
    const page = Number(pageRaw ?? 1);
    const limit = Number(limitRaw ?? 20);

    if (!Number.isSafeInteger(page) || page < 1) {
      throw new BadRequestException('page must be a positive integer');
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }

    if (
      decision !== undefined &&
      decision !== 'allow' &&
      decision !== 'block'
    ) {
      throw new BadRequestException('decision must be allow or block');
    }
    if (
      source !== undefined &&
      source !== 'rule' &&
      source !== 'ai' &&
      source !== 'fallback'
    ) {
      throw new BadRequestException('source must be rule, ai, or fallback');
    }
    if (ip !== undefined && (typeof ip !== 'string' || !ip.trim())) {
      throw new BadRequestException('ip must be a nonempty string');
    }

    const offset = (page - 1) * limit;
    const filters = [decision ?? null, source ?? null, ip ?? null];
    const where = `
      WHERE ($1::text IS NULL OR decision = $1)
        AND ($2::text IS NULL OR source = $2)
        AND ($3::text IS NULL OR ip = $3)
    `;
    const [requests, count] = await Promise.all([
      pool.query(
        `SELECT id, created_at, ip, method, path, decision, source,
                confidence, category, total_latency_ms
         FROM request_logs
         ${where}
         ORDER BY created_at DESC, id DESC
         LIMIT $4 OFFSET $5`,
        [...filters, limit, offset],
      ),
      pool.query<{ total: number }>(
        `SELECT COUNT(*)::integer AS total FROM request_logs ${where}`,
        filters,
      ),
    ]);

    return {
      items: requests.rows,
      page,
      limit,
      total: count.rows[0].total,
    };
  }
  @Get(':id')
  async detail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const result = await pool.query(
      `SELECT id, created_at, ip, method, path, query_string,
            decision, source, confidence, category, reason,
            suspicious, ai_latency_ms, total_latency_ms, summary
     FROM request_logs
     WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Request not found');
    }

    return result.rows[0];
  }
}
