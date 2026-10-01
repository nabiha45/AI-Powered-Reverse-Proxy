import type { Classification, AiProvider, RequestSummary } from './provider';
import { isClassification } from './validate';

export type AiDecision = {
  decision: 'allow' | 'block';
  source: 'ai' | 'fallback';
  confidence: number | null;
  category: string | null;
  reason: string;
  suspicious: boolean;
  aiLatencyMs: number;
};

export function applyClassification(
  result: Classification,
  blockConfidence: number,
  aiLatencyMs: number,
): AiDecision {
  const suspicious =
    result.decision === 'block' && result.confidence < blockConfidence;

  return {
    decision: result.decision === 'block' && !suspicious ? 'block' : 'allow',
    source: 'ai',
    confidence: result.confidence,
    category: result.category,
    reason: result.reason,
    suspicious,
    aiLatencyMs,
  };
}

export type AiDecisionOptions = {
  timeoutMs: number;
  failMode: 'open' | 'closed';
  blockConfidence: number;
};

export async function decideWithAi(
  provider: AiProvider,
  summary: RequestSummary,
  options: AiDecisionOptions,
): Promise<AiDecision> {
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failureReason = 'AI provider error';

  try {
    const result: unknown = await Promise.race([
      provider.classify(summary),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          failureReason = 'AI timed out';
          reject(new Error('AI timed out'));
        }, options.timeoutMs);
      }),
    ]);

    if (!isClassification(result)) {
      failureReason = 'AI returned invalid output';
      throw new Error(failureReason);
    }

    return applyClassification(
      result,
      options.blockConfidence,
      Date.now() - startedAt,
    );
  } catch {
    return {
      decision: options.failMode === 'closed' ? 'block' : 'allow',
      source: 'fallback',
      confidence: null,
      category: null,
      reason: `${failureReason}; fail-${options.failMode} applied.`,
      suspicious: false,
      aiLatencyMs: Date.now() - startedAt,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}