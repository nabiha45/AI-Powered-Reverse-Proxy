import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import httpProxy from 'http-proxy';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from './config';
import { initDatabase } from './database';
import { findRule } from './rules';
import { sendBlockedResponse } from './blocked_response';
import { logRuleDecision } from './request_logs';
import { captureRequestBody } from './request_body';
import type { Readable } from 'node:stream';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  const proxy = httpProxy.createProxyServer({
    target: config.upstreamUrl,
  });

  const timedOutRequests = new WeakSet<object>();

  proxy.on('proxyReq', (proxyRequest, request) => {
    proxyRequest.on('timeout', () => {
      timedOutRequests.add(request);
    });
  });
  proxy.on('proxyRes', (upstreamResponse, request) => {
    upstreamResponse.headers['x-request-id'] = request.headers['x-request-id'];
  });
  app.use(async (request: Request, response: Response) => {
    const startedAt = Date.now();
    const requestId = randomUUID();
    const clientIp = request.socket.remoteAddress ?? '';

    request.headers['x-request-id'] = requestId;
    request.headers['x-forwarded-for'] = clientIp;
    response.setHeader('X-Request-ID', requestId);

    let rule;

    try {
      rule = await findRule(clientIp);
    } catch {
      response.status(503).json({ error: 'Rule storage unavailable' });
      return;
    }
    if (rule) {
      response.once('finish', () => {
        void logRuleDecision(
          request,
          requestId,
          clientIp,
          rule,
          Date.now() - startedAt,
        ).catch((error: unknown) => {
          console.error('Failed to log rule decision', error);
        });
      });
    }
    if (rule?.decision === 'block') {
      sendBlockedResponse(response, requestId, rule.reason);
      return;
    }
    let replay: Readable | undefined;

    if (!rule) {
      try {
        const captured = await captureRequestBody(request);
        replay = captured.replay;
      } catch {
        response.status(400).json({ error: 'Could not read request body' });
        return;
      }
    }

    proxy.web(
      request,
      response,
      { proxyTimeout: config.upstreamTimeoutMs, buffer: replay },
      () => {
        if (response.headersSent) {
          response.end();
          return;
        }

        const timedOut = timedOutRequests.has(request);
        response.writeHead(timedOut ? 504 : 502, {
          'Content-Type': 'application/json',
        });
        response.end(
          JSON.stringify({
            error: timedOut ? 'Upstream timed out' : 'Upstream unavailable',
          }),
        );
      },
    );
  });

  await initDatabase();

  await app.listen(config.proxyPort);
}
void bootstrap();
