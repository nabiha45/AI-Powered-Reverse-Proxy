import { resolveDecision } from './resolve_decision';
import type { AiDecision } from './ai/decision';

describe('resolveDecision', () => {
  it('uses a matching rule without calling AI', async () => {
    const findRule = jest.fn(async () => ({
      decision: 'allow' as const,
      source: 'rule' as const,
      reason: 'IP is on the manual allowlist',
    }));

    const decideWithAi = jest.fn(async (): Promise<AiDecision> => ({
      decision: 'block',
      source: 'ai',
      confidence: 0.95,
      category: 'sql_injection',
      reason: 'AI recommends blocking',
      suspicious: false,
      aiLatencyMs: 1,
    }));

    const result = await resolveDecision(
      '127.0.0.1',
      findRule,
      decideWithAi,
    );

    expect(result.source).toBe('rule');
    expect(result.decision).toBe('allow');
    expect(findRule).toHaveBeenCalledWith('127.0.0.1');
    expect(decideWithAi).not.toHaveBeenCalled();
  });

  it('uses a matching block rule without calling AI', async () => {
  const findRule = jest.fn(async () => ({
    decision: 'block' as const,
    source: 'rule' as const,
    reason: 'Manual block',
  }));
  const decideWithAi = jest.fn();

  const result = await resolveDecision(
    '127.0.0.1',
    findRule,
    decideWithAi,
  );

  expect(result).toMatchObject({
    decision: 'block',
    source: 'rule',
    reason: 'Manual block',
  });
  expect(decideWithAi).not.toHaveBeenCalled();
});

it('calls AI when no rule matches', async () => {
  const findRule = jest.fn(async () => null);
  const aiDecision = {
    decision: 'allow' as const,
    source: 'ai' as const,
    confidence: 0.9,
    category: 'benign',
    reason: 'No threat detected',
    suspicious: false,
    aiLatencyMs: 1,
  };
  const decideWithAi = jest.fn(async () => aiDecision);

  const result = await resolveDecision(
    '127.0.0.1',
    findRule,
    decideWithAi,
  );

  expect(result).toBe(aiDecision);
  expect(decideWithAi).toHaveBeenCalledTimes(1);
});
});