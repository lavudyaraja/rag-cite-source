import { generateChatCompletion } from './llm-provider';
import type { RagasScores } from '@/types/rag';

interface EvaluateParams {
  query: string;
  answer: string;
  contextChunks: string[];
}

function extractScores(text: string): RagasScores | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed.faithfulness === 'number' &&
      typeof parsed.answerRelevance === 'number' &&
      typeof parsed.retrievalRecall === 'number'
    ) {
      return {
        faithfulness: Math.min(1, Math.max(0, parsed.faithfulness)),
        answerRelevance: Math.min(1, Math.max(0, parsed.answerRelevance)),
        retrievalRecall: Math.min(1, Math.max(0, parsed.retrievalRecall)),
      };
    }
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return {
          faithfulness: Math.min(1, Math.max(0, Number(parsed.faithfulness) || 0)),
          answerRelevance: Math.min(1, Math.max(0, Number(parsed.answerRelevance) || 0)),
          retrievalRecall: Math.min(1, Math.max(0, Number(parsed.retrievalRecall) || 0)),
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * RAGAS-Lite: lightweight LLM-based scoring of faithfulness, relevance, and recall.
 */
export async function evaluateRagas({
  query,
  answer,
  contextChunks,
}: EvaluateParams): Promise<RagasScores> {
  const context = contextChunks.join('\n\n---\n\n').slice(0, 12000);

  const prompt = `You are a RAG evaluation judge. Score the following RAG response on three metrics from 0.0 to 1.0:

1. faithfulness: Is the answer grounded in the provided context? (1.0 = fully supported, 0.0 = hallucinated)
2. answerRelevance: Does the answer address the user's question? (1.0 = fully relevant)
3. retrievalRecall: Did the retrieved context contain information needed to answer? (1.0 = complete coverage)

User Question: "${query}"

Retrieved Context:
${context || '(no context)'}

Generated Answer:
${answer}

Return ONLY a JSON object: {"faithfulness": 0.0, "answerRelevance": 0.0, "retrievalRecall": 0.0}`;

  try {
    const { text } = await generateChatCompletion({ prompt, jsonMode: true });
    const scores = extractScores(text);
    if (scores) return scores;
  } catch {
    // Quota or API errors — fail silently
  }

  return { faithfulness: 0, answerRelevance: 0, retrievalRecall: 0 };
}
