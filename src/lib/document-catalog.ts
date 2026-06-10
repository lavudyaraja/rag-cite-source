import { generateChatCompletion } from './llm-provider';

export interface DocumentCatalog {
  summary: string;
  tags: string[];
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * Generates an LLM summary and tags for a document based on sample chunk text.
 */
export async function generateDocumentCatalog(
  filename: string,
  sampleTexts: string[]
): Promise<DocumentCatalog> {
  const hasLlm =
    Boolean(process.env.GEMINI_API_KEY) || Boolean(process.env.NVIDIA_API_KEY);
  if (!hasLlm || sampleTexts.length === 0) {
    return {
      summary: `Document: ${filename}`,
      tags: [filename.split('.').pop()?.toLowerCase() || 'document'],
    };
  }

  const sample = sampleTexts
    .slice(0, 6)
    .join('\n\n---\n\n')
    .slice(0, 6000);

  try {
    const { text } = await generateChatCompletion({
      prompt: `Analyze this document excerpt and produce a catalog entry.

Filename: ${filename}

Excerpt:
${sample}

Return ONLY a JSON object with:
- "summary": 1-2 sentence description of the document's topic and purpose
- "tags": array of 3-8 lowercase topic tags for filtering (e.g. "machine-learning", "finance", "legal")

Example: {"summary": "...", "tags": ["research", "nlp"]}`,
      jsonMode: true,
    });

    const parsed = extractJsonObject(text);
    const summary =
      typeof parsed?.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : `Document: ${filename}`;
    const tags = Array.isArray(parsed?.tags)
      ? parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 8)
      : [];

    return {
      summary,
      tags: tags.length > 0 ? tags : [filename.split('.').pop()?.toLowerCase() || 'document'],
    };
  } catch (error) {
    console.error('Document catalog generation failed:', error);
    return {
      summary: `Document: ${filename}`,
      tags: [filename.split('.').pop()?.toLowerCase() || 'document'],
    };
  }
}
