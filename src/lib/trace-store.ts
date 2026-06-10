import type { RagTrace } from '@/types/rag';

const TRACE_KEY = 'insightrag:last-trace';
const ANSWER_KEY = 'insightrag:last-answer';

export function saveLastTrace(trace: RagTrace, answer?: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TRACE_KEY, JSON.stringify(trace));
    if (answer) sessionStorage.setItem(ANSWER_KEY, answer);
  } catch {
    // storage full or unavailable
  }
}

export function loadLastTrace(): RagTrace | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TRACE_KEY);
    return raw ? (JSON.parse(raw) as RagTrace) : null;
  } catch {
    return null;
  }
}

export function loadLastAnswer(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(ANSWER_KEY) || '';
}
