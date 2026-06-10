import { GoogleGenAI } from '@google/genai';
import { isTransientError } from './gemini-errors';

// Initialize the Google GenAI SDK.
// We fallback to empty string if GEMINI_API_KEY is not set (will fail at request time, instructing the user).
const apiKey = process.env.GEMINI_API_KEY || '';
export const ai = new GoogleGenAI({ apiKey });

/**
 * Helper to retry asynchronous operations with exponential backoff.
 * Especially helpful for handling Gemini API rate limit (429) errors.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 1,
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries > 0 && isTransientError(error)) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Generates a 768-dimensional vector embedding for the input text using gemini-embedding-2.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local');
  }

  const response = await retryWithBackoff(() =>
    ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    })
  );

  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error('No embeddings returned from Gemini API');
  }

  // The SDK returns an array of embeddings, where each contains a 'values' float array.
  const embedding = response.embeddings[0];
  if (!embedding || !embedding.values) {
    throw new Error('Embedding values are missing in the response');
  }

  return embedding.values;
}

/**
 * Generates vector embeddings for a batch of texts in a single API call using gemini-embedding-2.
 */
export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local');
  }

  if (texts.length === 0) return [];

  const response = await retryWithBackoff(() =>
    ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: texts,
      config: {
        outputDimensionality: 768,
      },
    })
  );

  if (!response.embeddings) {
    throw new Error('No embeddings returned from Gemini API');
  }

  return response.embeddings.map((emb) => {
    if (!emb.values) {
      throw new Error('Embedding values are missing in batch response');
    }
    return emb.values;
  });
}

