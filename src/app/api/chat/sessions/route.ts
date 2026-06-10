import { NextResponse } from 'next/server';
import {
  listChatSessions,
  upsertChatSession,
  deleteChatSession,
} from '@/lib/chat-sessions-db';
import type { ChatSession } from '@/types/rag';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessions = await listChatSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load sessions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = (await request.json()) as ChatSession;
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Session id is required' }, { status: 400 });
    }
    const saved = await upsertChatSession(session);
    return NextResponse.json({ success: true, session: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    await deleteChatSession(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
