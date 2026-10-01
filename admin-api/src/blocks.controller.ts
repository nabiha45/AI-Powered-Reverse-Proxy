import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { isIP } from 'node:net';
import { pool } from './database';
import { config } from './config';
import { createReviewProvider } from './ai/create_review_provider';
import type { ReviewInput } from './ai/review_provider';

const reviewProvider = createReviewProvider(config.aiProvider);

@Controller('api/blocks')
export class BlocksController {
  @Get()
  async list() {
    const result = await pool.query(
      `SELECT ip, source, reason, created_at, expires_at
       FROM blocks
       WHERE expires_at IS NULL OR expires_at > NOW()
       ORDER BY created_at DESC, ip`,
    );

    return result.rows;
  }
  @Post()
  async create(@Body() body: unknown) {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new BadRequestException('JSON object required');
    }

    const input = body as Record<string, unknown>;
    const ip = input.ip;
    const durationMinutes = input.durationMinutes;

    if (typeof ip !== 'string' || isIP(ip) === 0) {
      throw new BadRequestException('ip must be a valid IP address');
    }
    if (
      durationMinutes !== undefined &&
      (typeof durationMinutes !== 'number' ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes > 2147483647)
    ) {
      throw new BadRequestException(
        'durationMinutes must be a positive integer',
      );
    }

    const result = await pool.query(
      `INSERT INTO blocks (ip, source, reason, expires_at)
     VALUES (
       $1, 'manual', 'Manually blocked by admin',
       CASE WHEN $2::integer IS NULL
         THEN NULL
         ELSE NOW() + ($2::integer * INTERVAL '1 minute')
       END
     )
     ON CONFLICT (ip) DO UPDATE
     SET source = 'manual',
         reason = EXCLUDED.reason,
         created_at = NOW(),
         expires_at = EXCLUDED.expires_at
     RETURNING ip, source, reason, created_at, expires_at`,
      [ip, durationMinutes ?? null],
    );

    return result.rows[0];
  }
  @Delete(':ip')
  async remove(@Param('ip') ip: string) {
    if (isIP(ip) === 0) {
      throw new BadRequestException('ip must be a valid IP address');
    }

    const result = await pool.query(
      'DELETE FROM blocks WHERE ip = $1 RETURNING ip',
      [ip],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Block not found');
    }

    return { unblocked: true, ip };
  }
  @Post(':ip/review')
  @HttpCode(200)
  async review(@Param('ip') ip: string) {
    if (isIP(ip) === 0) {
      throw new BadRequestException('ip must be a valid IP address');
    }

    const block = await pool.query(
      `SELECT 1 FROM blocks
     WHERE ip = $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [ip],
    );
    if (block.rows.length === 0) {
      throw new NotFoundException('Active block not found');
    }

    const history = await pool.query<ReviewInput['recentRequests'][number]>(
      `SELECT method, path, decision, reason
     FROM request_logs
     WHERE ip = $1
       AND created_at >= NOW() - INTERVAL '10 minutes'
     ORDER BY created_at DESC
     LIMIT 50`,
      [ip],
    );

    const recommendation = await reviewProvider.review({
      ip,
      recentRequests: history.rows,
    });

    return {
      ip,
      provider: config.aiProvider,
      ...recommendation,
    };
  }
}
