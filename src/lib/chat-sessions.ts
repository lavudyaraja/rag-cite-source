import type { ChatSession } from '@/types/rag';

const STORAGE_KEY = 'insightrag:chat-sessions';

export function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function createSession(title?: string): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: title || 'New conversation',
    messages: [],
    selectedDocIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertSession(sessions: ChatSession[], session: ChatSession): ChatSession[] {
  const idx = sessions.findIndex((s) => s.id === session.id);
  const updated = { ...session, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    const next = [...sessions];
    next[idx] = updated;
    return next;
  }
  return [updated, ...sessions];
}

export function deleteSession(sessions: ChatSession[], id: string): ChatSession[] {
  return sessions.filter((s) => s.id !== id);
}

export function searchSessions(sessions: ChatSession[], query: string): ChatSession[] {
  const q = query.toLowerCase().trim();
  if (!q) return sessions;
  return sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.messages.some((m) => m.text.toLowerCase().includes(q))
  );
}

export function deriveSessionTitle(messages: { role: string; text: string }[]): string {
  const firstUser = messages.find((m) => m.role === 'user' && m.text.trim());
  if (!firstUser) return 'New conversation';
  const text = firstUser.text.trim();
  return text.length > 40 ? text.slice(0, 40) + '…' : text;
}

/** Load sessions from Neon DB, falling back to localStorage */
export async function fetchSessionsFromDb(): Promise<ChatSession[] | null> {
  try {
    const res = await fetch('/api/chat/sessions');
    const data = await res.json();
    if (data.success && Array.isArray(data.sessions)) {
      saveSessions(data.sessions);
      return data.sessions as ChatSession[];
    }
  } catch {
    // offline or API unavailable
  }
  return null;
}

/** Persist a single session to Neon DB */
export async function saveSessionToDb(session: ChatSession): Promise<void> {
  try {
    await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  } catch {
    // keep localStorage copy as fallback
  }
}

/** Delete session from Neon DB */
export async function deleteSessionFromDb(id: string): Promise<void> {
  try {
    await fetch(`/api/chat/sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    // ignore
  }
}
