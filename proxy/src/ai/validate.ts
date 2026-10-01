import type { Classification } from './provider';

export function isClassification(value: unknown): value is Classification {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { decision, confidence, category, reason } =
    value as Record<string, unknown>;

  return (
    (decision === 'allow' || decision === 'block') &&
    typeof confidence === 'number' &&
    Number.isFinite(confidence) &&
    confidence >= 0 &&
    confidence <= 1 &&
    typeof category === 'string' &&
    category.trim().length > 0 &&
    typeof reason === 'string' &&
    reason.trim().length > 0
  );
}