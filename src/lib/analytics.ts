import { sql } from './db';

let isTableInitialized = false;

/**
 * Initializes the query_logs table in Neon DB if it doesn't exist.
 */
export async function initQueryLogsTable() {
  if (isTableInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS query_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        embedding_time_ms INTEGER NOT NULL,
        db_time_ms INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    isTableInitialized = true;
  } catch (err) {
    console.error('Failed to initialize query_logs table:', err);
  }
}

interface LogMetricsParams {
  query: string;
  latencyMs: number;
  embeddingTimeMs: number;
  dbTimeMs: number;
  totalChunks: number;
}

/**
 * Logs search query timing and performance metrics to Neon DB.
 */
export async function logQueryMetrics({
  query,
  latencyMs,
  embeddingTimeMs,
  dbTimeMs,
  totalChunks,
}: LogMetricsParams) {
  try {
    await initQueryLogsTable();
    
    // Trim query to avoid storing massive prompts/errors if any
    const truncatedQuery = query.length > 500 ? query.substring(0, 500) + '...' : query;

    await sql`
      INSERT INTO query_logs (query, latency_ms, embedding_time_ms, db_time_ms, total_chunks)
      VALUES (${truncatedQuery}, ${latencyMs}, ${embeddingTimeMs}, ${dbTimeMs}, ${totalChunks})
    `;
  } catch (err) {
    console.error('Error logging query metrics to database:', err);
  }
}
