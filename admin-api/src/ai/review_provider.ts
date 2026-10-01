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

export interface ReviewProvider {
  review(input: ReviewInput): Promise<ReviewRecommendation>;
}