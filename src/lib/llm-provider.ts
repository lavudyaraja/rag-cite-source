import { ai, retryWithBackoff } from './gemini';

export type LlmProviderId = 'gemini' | 'nvidia';

const GEMINI_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const NVIDIA_URL =
  process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = process.env.NVIDIA_CHAT_MODEL || 'qwen/qwen3.5-397b-a17b';

function nvidiaKey(): string {
  return process.env.NVIDIA_API_KEY || '';
}

function geminiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

function shouldFallbackToNvidia(_err: unknown): boolean {
  return Boolean(nvidiaKey());
}

export interface ChatCompletionOptions {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  maxTokens?: number;
}

function buildNvidiaMessages(prompt: string, systemInstruction?: string) {
  const messages: { role: string; content: string }[] = [];
  if (systemInstruction?.trim()) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

async function generateNvidiaChat({
  prompt,
  systemInstruction,
  jsonMode,
  maxTokens = 8192,
}: ChatCompletionOptions): Promise<string> {
  const key = nvidiaKey();
  if (!key) throw new Error('NVIDIA_API_KEY is not configured');

  const res = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: buildNvidiaMessages(
        jsonMode ? `${prompt}\n\nRespond with valid JSON only.` : prompt,
        systemInstruction
      ),
      max_tokens: maxTokens,
      temperature: 0.6,
      top_p: 0.95,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`NVIDIA API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('NVIDIA API returned an empty response');
  }
  return text;
}

async function* streamNvidiaChat({
  prompt,
  systemInstruction,
  maxTokens = 8192,
}: ChatCompletionOptions): AsyncGenerator<string> {
  const key = nvidiaKey();
  if (!key) throw new Error('NVIDIA_API_KEY is not configured');

  const res = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: buildNvidiaMessages(prompt, systemInstruction),
      max_tokens: maxTokens,
      temperature: 0.6,
      top_p: 0.95,
      stream: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`NVIDIA API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('NVIDIA stream unavailable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) yield delta;
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
}

async function generateGeminiChat({
  prompt,
  systemInstruction,
  jsonMode,
}: ChatCompletionOptions): Promise<string> {
  if (!geminiKey()) throw new Error('GEMINI_API_KEY is not configured');

  const response = await retryWithBackoff(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    0
  );

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

async function* streamGeminiChat({
  prompt,
  systemInstruction,
}: ChatCompletionOptions): AsyncGenerator<string> {
  if (!geminiKey()) throw new Error('GEMINI_API_KEY is not configured');

  const stream = await retryWithBackoff(
    () =>
      ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction },
      }),
    0
  );

  for await (const chunk of stream) {
    const text = chunk.text || '';
    if (text) yield text;
  }
}

/** Non-streaming chat — tries Gemini, falls back to NVIDIA Qwen on quota/errors */
export async function generateChatCompletion(
  options: ChatCompletionOptions
): Promise<{ text: string; provider: LlmProviderId }> {
  try {
    const text = await generateGeminiChat(options);
    return { text, provider: 'gemini' };
  } catch (geminiErr) {
    if (!shouldFallbackToNvidia(geminiErr)) throw geminiErr;
    const text = await generateNvidiaChat(options);
    return { text, provider: 'nvidia' };
  }
}

/** Streaming chat — tries Gemini, falls back to NVIDIA Qwen on quota/errors */
export async function* streamChatCompletion(
  options: ChatCompletionOptions
): AsyncGenerator<{ text: string; provider: LlmProviderId }> {
  try {
    for await (const text of streamGeminiChat(options)) {
      yield { text, provider: 'gemini' };
    }
    return;
  } catch (geminiErr) {
    if (!shouldFallbackToNvidia(geminiErr)) throw geminiErr;
    for await (const text of streamNvidiaChat(options)) {
      yield { text, provider: 'nvidia' };
    }
  }
}

export function isNvidiaFallbackAvailable(): boolean {
  return Boolean(nvidiaKey());
}

function extractJsonStringArray(text: string): string[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const tryParse = (raw: string): string[] | null => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
      }
    } catch {
      // fall through
    }
    return null;
  };

  const direct = tryParse(cleaned);
  if (direct && direct.length > 0) return direct;

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const extracted = tryParse(arrayMatch[0]);
    if (extracted && extracted.length > 0) return extracted;
  }

  return [];
}

/** Expands a user query into search variations (Gemini first, NVIDIA fallback) */
export async function expandQuery(query: string): Promise<string[]> {
  if (process.env.ENABLE_QUERY_EXPANSION !== 'true') {
    return [query];
  }
  if (!geminiKey() && !nvidiaKey()) {
    return [query];
  }

  try {
    const prompt = `You are an AI Search Optimizer. Your job is to take a user query and generate 3 unique search query variations that capture the synonyms, alternative technical terms, or key concepts related to the user's intent.
Original Query: "${query}"

Return ONLY a JSON array of exactly 3 strings. No markdown, no explanation, no extra keys.
Example: ["variation 1", "variation 2", "variation 3"]`;

    const { text } = await generateChatCompletion({ prompt, jsonMode: true });
    const variations = extractJsonStringArray(text);
    if (variations.length > 0) {
      return [query, ...variations.slice(0, 3)];
    }
  } catch {
    // fall back to original query only
  }

  return [query];
}
