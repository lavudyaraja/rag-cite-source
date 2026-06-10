import { sql } from './db';
import type { ChatMessage, ChatSession } from '@/types/rag';

let tableReady: Promise<void> | null = null;

export async function ensureChatSessionsTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL DEFAULT 'New conversation',
          messages JSONB NOT NULL DEFAULT '[]'::jsonb,
          selected_doc_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })();
  }
  return tableReady;
}

interface DbRow {
  id: string;
  title: string;
  messages: ChatMessage[];
  selected_doc_ids: string[];
  created_at: string;
  updated_at: string;
}

function rowToSession(row: DbRow): ChatSession {
  return {
    id: row.id,
    title: row.title,
    messages: Array.isArray(row.messages) ? row.messages : [],
    selectedDocIds: Array.isArray(row.selected_doc_ids) ? row.selected_doc_ids : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listChatSessions(): Promise<ChatSession[]> {
  await ensureChatSessionsTable();
  const rows = await sql`
    SELECT id, title, messages, selected_doc_ids, created_at, updated_at
    FROM chat_sessions
    ORDER BY updated_at DESC
    LIMIT 100
  `;
  return (rows as DbRow[]).map(rowToSession);
}

export async function upsertChatSession(session: ChatSession): Promise<ChatSession> {
  await ensureChatSessionsTable();
  const rows = await sql`
    INSERT INTO chat_sessions (id, title, messages, selected_doc_ids, updated_at)
    VALUES (
      ${session.id}::uuid,
      ${session.title},
      ${JSON.stringify(session.messages)}::jsonb,
      ${JSON.stringify(session.selectedDocIds)}::jsonb,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      messages = EXCLUDED.messages,
      selected_doc_ids = EXCLUDED.selected_doc_ids,
      updated_at = NOW()
    RETURNING id, title, messages, selected_doc_ids, created_at, updated_at
  `;
  return rowToSession(rows[0] as DbRow);
}

export async function deleteChatSession(id: string): Promise<void> {
  await ensureChatSessionsTable();
  await sql`DELETE FROM chat_sessions WHERE id = ${id}::uuid`;
}
