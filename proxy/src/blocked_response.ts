import type { Response } from 'express';

export function sendBlockedResponse(
  response: Response,
  requestId: string,
  reason: string,
): void {
  response.writeHead(403, {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
  });
  response.end(JSON.stringify({ blocked: true, requestId, reason }));
}