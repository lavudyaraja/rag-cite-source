/**
 * User-facing and logging helpers for Gemini / Google AI API errors.
 */

export function isQuotaExceededError(err: unknown): boolean {
  const msg = extractErrorMessage(err).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('too many requests') ||
    msg.includes('free_tier')
  );
}

export function isTransientError(err: unknown): boolean {
  if (isQuotaExceededError(err)) return false;
  const msg = extractErrorMessage(err).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('temporary')
  );
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

/** Parse nested JSON error blobs from the Gemini SDK */
function parseNestedMessage(raw: string): string {
  try {
    const outer = JSON.parse(raw);
    if (typeof outer?.error?.message === 'string') {
      const inner = outer.error.message;
      try {
        const nested = JSON.parse(inner);
        if (nested?.error?.message) return nested.error.message;
      } catch {
        return inner;
      }
      return inner;
    }
    if (typeof outer?.error?.message === 'string') return outer.error.message;
    if (typeof outer?.message === 'string') return outer.message;
  } catch {
    // not JSON
  }
  return raw;
}

export function formatUserFacingError(err: unknown): string {
  const raw = extractErrorMessage(err);
  const message = parseNestedMessage(raw);

  if (isQuotaExceededError(message) || isQuotaExceededError(raw)) {
    const retryMatch = message.match(/retry in ([\d.]+)s/i);
    const retryHint = retryMatch
      ? ` Try again in about ${Math.ceil(parseFloat(retryMatch[1]))} seconds.`
      : ' Try again after your daily quota resets (usually within 24 hours).';

    const fallbackNote = process.env.NVIDIA_API_KEY
      ? '\n\nNVIDIA Qwen fallback is configured — chat answers will automatically use Qwen when Gemini is unavailable.'
      : '\n\nTip: Add NVIDIA_API_KEY to .env.local to enable automatic Qwen fallback when Gemini quota is exceeded.';

    return `Gemini API quota reached

You've hit the free-tier limit for Gemini requests (20/day per model).

What you can do:
• Wait for the quota to reset${retryHint}
• Add billing in Google AI Studio for higher limits
• Use Dry-Run Tester for retrieval-only tests (no LLM answer)${fallbackNote}

Your documents and chat history are still saved.`;
  }

  if (message.includes('GEMINI_API_KEY') || message.includes('API key')) {
    return `API key not configured

Add GEMINI_API_KEY to your .env.local file and restart the dev server.`;
  }

  if (message.includes('DATABASE_URL')) {
    return `Database not configured

Add DATABASE_URL to your .env.local file.`;
  }

  if (message.length > 280 || message.includes('{') || message.includes('ApiError')) {
    return `Something went wrong

The AI service returned an error. If this keeps happening, check your API key and quota in Google AI Studio.`;
  }

  return message;
}
