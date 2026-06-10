/**
 * Repairs common PDF font-encoding glitches in academic papers.
 * Many IEEE/CVPR PDFs shift WinAnsi glyphs by +29 (e.g. "7HVW" → "Test").
 */

const GARBLED_TOKEN = /^[0-9%(<][A-Z0-9%(<]{2,}$/;

function englishScore(text: string): number {
  const lower = text.toLowerCase();
  const words = ['the', 'and', 'error', 'rate', 'test', 'table', 'figure', 'random', 'baseline', 'with', 'for'];
  let score = (lower.match(/[a-z]/g) || []).length;
  for (const w of words) {
    if (lower.includes(w)) score += 8;
  }
  return score;
}

function shiftPrintable(text: string, delta: number): string {
  return text
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || code > 126) return char;
      const next = code + delta;
      if (next < 32 || next > 126) return char;
      return String.fromCharCode(next);
    })
    .join('');
}

function repairToken(token: string): string {
  if (!GARBLED_TOKEN.test(token) && !/[0-9][A-Z]{3,}/.test(token)) {
    return token;
  }
  const shifted = shiftPrintable(token, 29);
  return englishScore(shifted) > englishScore(token) ? shifted : token;
}

/**
 * Applies +29 glyph repair to garbled PDF tokens and normalizes whitespace.
 */
export function repairPdfText(text: string): string {
  if (!text.trim()) return text;

  const hasGarbled =
    /7HVW|5DQGRP|%DVHOLQH|[0-9%][A-Z]{4,}/.test(text) ||
    (text.match(/[A-Z]{4,}/g) || []).length > 3;

  let repaired = text.replace(/\s+/g, ' ').trim();

  if (hasGarbled) {
    repaired = repaired
      .split(/(\s+)/)
      .map((part) => (part.trim() ? repairToken(part) : part))
      .join('');
  }

  return repaired
    .replace(/\u0003/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function extractSectionTitle(text: string): string | undefined {
  const firstLine = text.split(/\r?\n/)[0]?.trim();
  if (!firstLine) return undefined;

  const patterns = [
    /^(Table \d+:[^\n]{0,200})/i,
    /^(Figure \d+:[^\n]{0,200})/i,
    /^(Section \d+[\d.]*\s+[^\n]{0,120})/i,
    /^(\d+(?:\.\d+)*\s+[A-Z][^\n]{3,80})$/,
    /^(Abstract|Introduction|Related Work|Methods?|Experiments?|Results?|Discussion|Conclusion|References)\b[^\n]*/i,
  ];

  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    if (match) return match[1].trim();
  }

  if (/^[A-Z][A-Za-z0-9\s\-:,]{4,80}$/.test(firstLine) && firstLine === firstLine.toUpperCase()) {
    return firstLine;
  }

  return undefined;
}
