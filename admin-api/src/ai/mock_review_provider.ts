import type {
  ReviewInput,
  ReviewProvider,
  ReviewRecommendation,
} from './review_provider';

export class MockReviewProvider implements ReviewProvider {
  async review(input: ReviewInput): Promise<ReviewRecommendation> {
    const hasRecentBlock = input.recentRequests.some(
      (request) => request.decision === 'block',
    );

    return hasRecentBlock
      ? { recommendation: 'keep', reason: 'Recent requests were blocked.' }
      : {
          recommendation: 'lift',
          reason: 'No recent blocked requests were found.',
        };
  }
}