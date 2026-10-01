import type { RuleDecision } from './rules';
import type { AiDecision } from './ai/decision';

export async function resolveDecision(
  clientIp: string,
  findRule: (ip: string) => Promise<RuleDecision | null>,
  decideWithAi: () => Promise<AiDecision>,
): Promise<RuleDecision | AiDecision> {
  const rule = await findRule(clientIp);

  if (rule) {
    return rule;
  }

  return decideWithAi();
}