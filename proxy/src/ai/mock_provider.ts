import type { AiProvider, Classification, RequestSummary } from './provider';

export class MockProvider implements AiProvider {
  async classify(summary: RequestSummary): Promise<Classification> {
    const rawContent =
      `${summary.path} ${summary.query} ${summary.bodyPreview}`.toLowerCase();

    let content = rawContent;
    try {
      content = decodeURIComponent(rawContent);
    } catch {
      // Keep the original text if the request contains invalid percent encoding.
    }

    if (
      content.includes('union select') ||
      content.includes('drop table') ||
      content.includes('information_schema') ||
      content.includes("' or '1'='1")
    ) {
      return {
        decision: 'block',
        confidence: 0.95,
        category: 'sql_injection',
        reason: 'The request contains a SQL injection indicator.',
      };
    }

    if (
      content.includes('<script') ||
      content.includes('javascript:') ||
      content.includes('onerror=')
    ) {
      return {
        decision: 'block',
        confidence: 0.95,
        category: 'xss',
        reason: 'The request contains a script injection indicator.',
      };
    }

    if (content.includes('../') || content.includes('..\\')) {
      return {
        decision: 'block',
        confidence: 0.95,
        category: 'path_traversal',
        reason: 'The request contains a directory traversal pattern.',
      };
    }

    const path = summary.path.toLowerCase();
    if (path.includes('/.env') || path.includes('/.git/')) {
      return {
        decision: 'block',
        confidence: 0.9,
        category: 'scanner_or_bot',
        reason: 'The request targets a sensitive path.',
      };
    }

    const userAgent = summary.userAgent.toLowerCase();

    if (['sqlmap', 'nikto', 'nmap'].some((name) => userAgent.includes(name))) {
      return {
        decision: 'block',
        confidence: 0.95,
        category: 'scanner_or_bot',
        reason: 'The User-Agent matches a known scanner name.',
      };
    }

    if (summary.requestCountLastMinute >= 30) {
      return {
        decision: 'block',
        confidence: 0.8,
        category: 'rate_abuse',
        reason: 'The IP sent at least 30 requests in the last minute.',
      };
    }
    return {
      decision: 'allow',
      confidence: 0.9,
      category: 'benign',
      reason: 'No mock detection pattern matched.',
    };
  }
}
