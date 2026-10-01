import type {
  ReviewInput,
  ReviewProvider,
  ReviewRecommendation,
} from './review_provider';

function isRecommendation(value: unknown): value is ReviewRecommendation {
  if (typeof value !== 'object' || value === null) return false;

  const result = value as Record<string, unknown>;
  return (
    (result.recommendation === 'keep' || result.recommendation === 'lift') &&
    typeof result.reason === 'string' &&
    result.reason.trim().length > 0
  );
}

export async function reviewWithTimeout(
  provider: ReviewProvider,
  input: ReviewInput,
  timeoutMs: number,
): Promise<ReviewRecommendation> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result: unknown = await Promise.race([
      provider.review(input),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('AI review timed out')),
          timeoutMs,
        );
      }),
    ]);

    if (!isRecommendation(result)) {
      throw new Error('AI review returned invalid output');
    }

    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
