import type { ReviewProvider } from './review_provider';
import { MockReviewProvider } from './mock_review_provider';

export function createReviewProvider(name: string): ReviewProvider {
  if (name === 'mock') {
    return new MockReviewProvider();
  }

  throw new Error(`Unsupported AI_PROVIDER: ${name}`);
}