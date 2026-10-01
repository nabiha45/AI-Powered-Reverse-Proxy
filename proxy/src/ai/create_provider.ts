import type { AiProvider } from './provider';
import { MockProvider } from './mock_provider';

export function createAiProvider(name: string): AiProvider {
  if (name === 'mock') {
    return new MockProvider();
  }

  throw new Error(`Unsupported AI_PROVIDER: ${name}`);
}