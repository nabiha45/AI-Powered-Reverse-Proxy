import type { AiProvider } from './provider';
import { MockProvider } from './mock_provider';
import { config } from '../config';
import { GeminiProvider } from './gemini_provider';

export function createAiProvider(name: string): AiProvider {
  if (name === 'mock') {
    return new MockProvider();
  }
  if (name === 'gemini') {
    return new GeminiProvider(config.geminiApiKey ?? '', config.geminiModel);
  }

  throw new Error(`Unsupported AI_PROVIDER: ${name}`);
}
