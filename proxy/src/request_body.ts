import type { Request } from 'express';
import { Readable } from 'node:stream';

export async function captureRequestBody(request: Request): Promise<{
  preview: Buffer;
  replay: Readable;
}> {
  const chunks: Buffer[] = [];
  const previewChunks: Buffer[] = [];
  let previewLength = 0;

  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(bytes);

    const remaining = 2048 - previewLength;
    if (remaining > 0) {
      const part = bytes.subarray(0, remaining);
      previewChunks.push(part);
      previewLength += part.length;
    }
  }

  return {
    preview: Buffer.concat(previewChunks),
    replay: Readable.from(chunks),
  };
}