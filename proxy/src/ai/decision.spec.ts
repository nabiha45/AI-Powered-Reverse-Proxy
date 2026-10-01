import { applyClassification, decideWithAi } from './decision';
import type { AiProvider } from './provider';

describe('applyClassification', () => {
  it('allows a low-confidence block recommendation and flags it', () => {
    const result = applyClassification(
      {
        decision: 'block',
        confidence: 0.6,
        category: 'sql_injection',
        reason: 'SQL indicator detected',
      },
      0.7,
      5,
    );

    expect(result).toMatchObject({
      decision: 'allow',
      source: 'ai',
      confidence: 0.6,
      category: 'sql_injection',
      reason: 'SQL indicator detected',
      suspicious: true,
      aiLatencyMs: 5,
    });
  });

  it.each([
  ['open', 'allow'],
  ['closed', 'block'],
] as const)(
  'uses fail-%s when the AI provider errors',
  async (failMode, expectedDecision) => {
    const provider = {
      classify: async () => {
        throw new Error('AI unavailable');
      },
      review: async () => ({
        recommendation: 'keep' as const,
        reason: 'Unused in this test',
      }),
    };

    const result = await decideWithAi(
      provider,
      {
        method: 'GET',
        path: '/products',
        query: '',
        clientIp: '127.0.0.1',
        userAgent: 'test',
        headers: {},
        bodyPreview: '',
        requestCountLastMinute: 1,
      },
      { timeoutMs: 2000, failMode, blockConfidence: 0.7 },
    );

    expect(result.decision).toBe(expectedDecision);
    expect(result.source).toBe('fallback');
    expect(result.reason).toContain(`fail-${failMode}`);
  },
);
  
it('uses fallback when the AI response is malformed', async () => {
  const provider = {
    classify: async () => ({ decision: 'block' }), // Missing required fields
    review: async () => ({ recommendation: 'keep', reason: 'Unused' }),
  } as unknown as AiProvider;

  const result = await decideWithAi(
    provider,
    {
      method: 'GET',
      path: '/products',
      query: '',
      clientIp: '127.0.0.1',
      userAgent: 'test',
      headers: {},
      bodyPreview: '',
      requestCountLastMinute: 1,
    },
    { timeoutMs: 2000, failMode: 'open', blockConfidence: 0.7 },
  );

  expect(result.decision).toBe('allow');
  expect(result.source).toBe('fallback');
  expect(result.reason).toContain('invalid output');
});

it('uses fallback when the AI provider times out', async () => {
  const provider = {
    classify: () => new Promise<never>(() => {}), // Never resolves
    review: async () => ({
      recommendation: 'keep' as const,
      reason: 'Unused',
    }),
  };

  const result = await decideWithAi(
    provider,
    {
      method: 'GET',
      path: '/products',
      query: '',
      clientIp: '127.0.0.1',
      userAgent: 'test',
      headers: {},
      bodyPreview: '',
      requestCountLastMinute: 1,
    },
    { timeoutMs: 20, failMode: 'open', blockConfidence: 0.7 },
  );

  expect(result.decision).toBe('allow');
  expect(result.source).toBe('fallback');
  expect(result.reason).toContain('AI timed out');
});
});