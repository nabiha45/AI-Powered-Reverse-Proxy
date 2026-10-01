import type { Request } from 'express';
import type { RequestSummary } from './provider';

export function buildSummary(
  request: Request,
  clientIp: string,
  bodyPreviewBytes: Buffer,
  requestCountLastMinute: number,
): RequestSummary {
  const questionMark = request.url.indexOf('?');
  const path =
    questionMark === -1 ? request.url : request.url.slice(0, questionMark);
  const query =
    questionMark === -1 ? '' : request.url.slice(questionMark + 1);

  const headers: Record<string, string> = {};
  for (const name of ['content-type', 'accept', 'referer'] as const) {
    const value = request.headers[name];
    if (value) {
      headers[name] = value;
    }
  }

  return {
    method: request.method,
    path,
    query,
    clientIp,
    userAgent: request.headers['user-agent'] ?? '',
    headers,
    bodyPreview: bodyPreviewBytes.subarray(0, 2048).toString('utf8'),
    requestCountLastMinute,
  };
}