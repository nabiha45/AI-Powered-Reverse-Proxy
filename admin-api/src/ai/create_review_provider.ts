import type { ReviewProvider } from './review_provider';
import { MockReviewProvider } from './mock_review_provider';
import { config } from '../config';
import { GeminiReviewProvider } from './gemini_review_provider';

export function createReviewProvider(name: string): ReviewProvider {
  if (name === 'mock') {
    return new MockReviewProvider();
  }
  if (name === 'gemini') {
    return new GeminiReviewProvider(
      config.geminiApiKey ?? '',
      config.geminiModel,
    );
  }

  throw new Error(`Unsupported AI_PROVIDER: ${name}`);
}
