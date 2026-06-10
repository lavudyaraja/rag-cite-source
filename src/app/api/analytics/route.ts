import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { initQueryLogsTable } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ensure the logs table exists
    await initQueryLogsTable();

    // 1. Fetch overall KPIs from query_logs
    const kpiResult = await sql`
      SELECT 
        COUNT(*)::integer as total_queries,
        ROUND(COALESCE(AVG(latency_ms), 0))::integer as avg_latency,
        ROUND(COALESCE(AVG(embedding_time_ms), 0))::integer as avg_embedding,
        ROUND(COALESCE(AVG(db_time_ms), 0))::integer as avg_db,
        ROUND(COALESCE(AVG(total_chunks), 0), 1)::float as avg_chunks
      FROM query_logs
    `;
    const kpis = kpiResult[0] || {
      total_queries: 0,
      avg_latency: 0,
      avg_embedding: 0,
      avg_db: 0,
      avg_chunks: 0,
    };

    // 2. Fetch document & chunk statistics
    const docResult = await sql`
      SELECT 
        COUNT(*)::integer as total_documents,
        SUM(COALESCE(chunk_count, 0))::integer as total_chunks
      FROM documents
    `;
    const docStats = docResult[0] || {
      total_documents: 0,
      total_chunks: 0,
    };

    // 3. Fetch recent queries for the list (last 15)
    const recentQueries = await sql`
      SELECT id, query, latency_ms, embedding_time_ms, db_time_ms, total_chunks, created_at
      FROM query_logs
      ORDER BY created_at DESC
      LIMIT 15
    `;

    // 4. Fetch timeline queries (last 30, in chronological order for the chart)
    const timelineQueries = await sql`
      SELECT id, query, latency_ms, embedding_time_ms, db_time_ms, total_chunks, created_at
      FROM (
        SELECT id, query, latency_ms, embedding_time_ms, db_time_ms, total_chunks, created_at
        FROM query_logs
        ORDER BY created_at DESC
        LIMIT 30
      ) sub
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      kpis: {
        totalQueries: kpis.total_queries,
        avgLatencyMs: kpis.avg_latency,
        avgEmbeddingMs: kpis.avg_embedding,
        avgDbMs: kpis.avg_db,
        avgChunks: kpis.avg_chunks,
        totalDocuments: docStats.total_documents,
        totalChunks: docStats.total_chunks || 0,
      },
      recentQueries: recentQueries.map((q: any) => ({
        id: q.id,
        query: q.query,
        latencyMs: q.latency_ms,
        embeddingTimeMs: q.embedding_time_ms,
        dbTimeMs: q.db_time_ms,
        totalChunks: q.total_chunks,
        createdAt: q.created_at,
      })),
      timeline: timelineQueries.map((q: any, index: number) => ({
        index: index + 1,
        query: q.query.length > 25 ? q.query.substring(0, 25) + '...' : q.query,
        latencyMs: q.latency_ms,
        embeddingTimeMs: q.embedding_time_ms,
        dbTimeMs: q.db_time_ms,
        totalChunks: q.total_chunks,
        timeLabel: new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      })),
    });
  } catch (error: any) {
    console.error('Error in Analytics API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
