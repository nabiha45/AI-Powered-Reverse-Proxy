export type RequestSummary = {
  method: string;
  path: string;
  query: string;
  clientIp: string;
  userAgent: string;
  headers: Record<string, string>;
  bodyPreview: string;
  requestCountLastMinute: number;
};

export type Classification = {
  decision: 'allow' | 'block';
  confidence: number;
  category: string;
  reason: string;
};

export type ReviewInput = {
  ip: string;
  recentRequests: Array<{
    method: string;
    path: string;
    decision: 'allow' | 'block';
    reason: string;
  }>;
};

export type ReviewRecommendation = {
  recommendation: 'keep' | 'lift';
  reason: string;
};

export interface AiProvider {
  classify(summary: RequestSummary): Promise<Classification>;
  review(input: ReviewInput): Promise<ReviewRecommendation>;
}