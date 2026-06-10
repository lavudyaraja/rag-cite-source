import type { TokenUsage } from '@/types/rag';

/** Rough token estimate: ~4 chars per token for English text */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Gemini 2.5 Flash pricing (approximate, per 1M tokens) */
const GEMINI_FLASH_INPUT_PER_M = 0.15;
const GEMINI_FLASH_OUTPUT_PER_M = 0.6;
const GEMINI_EMBED_PER_M = 0.01;

export function calculateTokenUsage(
  promptText: string,
  completionText: string,
  embeddingTexts: string[] = []
): TokenUsage {
  const promptTokens = estimateTokens(promptText);
  const completionTokens = estimateTokens(completionText);
  const embeddingTokens = embeddingTexts.reduce((sum, t) => sum + estimateTokens(t), 0);
  const totalTokens = promptTokens + completionTokens + embeddingTokens;

  const inputCost = (promptTokens / 1_000_000) * GEMINI_FLASH_INPUT_PER_M;
  const outputCost = (completionTokens / 1_000_000) * GEMINI_FLASH_OUTPUT_PER_M;
  const embedCost = (embeddingTokens / 1_000_000) * GEMINI_EMBED_PER_M;
  const estimatedCostUsd = Number((inputCost + outputCost + embedCost).toFixed(6));

  return {
    promptTokens: promptTokens + embeddingTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
  };
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return '< $0.0001';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}
