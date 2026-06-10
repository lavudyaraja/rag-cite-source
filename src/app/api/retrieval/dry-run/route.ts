import { NextResponse } from 'next/server';
import { runHybridRetrieval } from '@/lib/retrieval';
import { logQueryMetrics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query, documentIds, topK = 10, rrfConstant = 60 } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ success: false, error: 'Query string is required' }, { status: 400 });
    }

    const result = await runHybridRetrieval({
      query: query.trim(),
      documentIds,
      topK,
      rrfConstant,
    });

    logQueryMetrics({
      query: `[dry-run] ${query.trim()}`,
      latencyMs: result.totalLatencyMs,
      embeddingTimeMs: result.embeddingTimeMs,
      dbTimeMs: result.dbRetrievalTimeMs,
      totalChunks: result.totalChunksFound,
    }).catch((err) => console.error('Failed to log dry-run metrics:', err));

    return NextResponse.json({
      success: true,
      trace: {
        originalQuery: result.originalQuery,
        expandedQueries: result.expandedQueries,
        embeddingTimeMs: result.embeddingTimeMs,
        dbRetrievalTimeMs: result.dbRetrievalTimeMs,
        llmStreamTimeMs: 0,
        totalChunksFound: result.totalChunksFound,
        retrievedChunks: result.retrievedChunks,
        totalLatencyMs: result.totalLatencyMs,
        dryRun: true,
      },
      topChunks: result.topChunks,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Dry-run retrieval failed';
    console.error('Dry-run error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
