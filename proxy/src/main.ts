import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import httpProxy from 'http-proxy';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from './config';
import { initDatabase } from './database';

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
  app.use((request: Request, response: Response) => {
    const requestId = randomUUID();
    const clientIp = request.socket.remoteAddress ?? '';

    request.headers['x-request-id'] = requestId;
    request.headers['x-forwarded-for'] = clientIp;
    response.setHeader('X-Request-ID', requestId);
    proxy.web(request, response, { proxyTimeout: config.upstreamTimeoutMs }, () => {
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
    });
  });

  await initDatabase();

  await app.listen(config.proxyPort);
}
void bootstrap();
