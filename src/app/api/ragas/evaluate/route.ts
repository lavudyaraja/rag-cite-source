import { NextResponse } from 'next/server';
import { evaluateRagas } from '@/lib/ragas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query, answer, contextChunks } = await request.json();

    if (!query || !answer) {
      return NextResponse.json(
        { success: false, error: 'query and answer are required' },
        { status: 400 }
      );
    }

    const scores = await evaluateRagas({
      query,
      answer,
      contextChunks: Array.isArray(contextChunks) ? contextChunks : [],
    });

    return NextResponse.json({ success: true, scores });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'RAGAS evaluation failed';
    console.error('RAGAS error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
