import { sql } from './db';
import { getEmbeddingsBatch } from './gemini';
import { expandQuery } from './llm-provider';
import type { RetrievedChunk } from '@/types/rag';

export interface RetrievalOptions {
  query: string;
  documentIds?: string[];
  topK?: number;
  rrfConstant?: number;
}

export interface RetrievalResult {
  originalQuery: string;
  expandedQueries: string[];
  embeddingTimeMs: number;
  dbRetrievalTimeMs: number;
  totalChunksFound: number;
  retrievedChunks: RetrievedChunk[];
  topChunks: RetrievedChunk[];
  totalLatencyMs: number;
}

export async function runHybridRetrieval({
  query,
  documentIds,
  topK = 5,
  rrfConstant = 60,
}: RetrievalOptions): Promise<RetrievalResult> {
  const startTime = Date.now();
  const expandedQueries = await expandQuery(query);

  const embeddingStartTime = Date.now();
  const queryEmbeddings = await getEmbeddingsBatch(expandedQueries);
  const embeddingTime = Date.now() - embeddingStartTime;

  const dbStartTime = Date.now();
  const useDocFilter = Array.isArray(documentIds) && documentIds.length > 0;
  const retrievalPromises: Promise<Record<string, unknown>[]>[] = [];

  expandedQueries.forEach((expandedQuery, idx) => {
    const vector = queryEmbeddings[idx];
    const vectorJson = JSON.stringify(vector);

    const vectorPromise = useDocFilter
      ? sql`
          SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, d.filename,
                 (dc.embedding <=> ${vectorJson}::vector) as distance
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE d.id = ANY(${documentIds})
            AND dc.embedding IS NOT NULL
          ORDER BY dc.embedding <=> ${vectorJson}::vector
          LIMIT 30
        `
      : sql`
          SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, d.filename,
                 (dc.embedding <=> ${vectorJson}::vector) as distance
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE dc.embedding IS NOT NULL
          ORDER BY dc.embedding <=> ${vectorJson}::vector
          LIMIT 30
        `;

    const textPromise = useDocFilter
      ? sql`
          SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, d.filename,
                 ts_rank_cd(dc.tsv, plainto_tsquery('english', ${expandedQuery})) as keyword_score
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE dc.tsv @@ plainto_tsquery('english', ${expandedQuery})
            AND d.id = ANY(${documentIds})
          ORDER BY keyword_score DESC
          LIMIT 30
        `
      : sql`
          SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, d.filename,
                 ts_rank_cd(dc.tsv, plainto_tsquery('english', ${expandedQuery})) as keyword_score
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE dc.tsv @@ plainto_tsquery('english', ${expandedQuery})
          ORDER BY keyword_score DESC
          LIMIT 30
        `;

    retrievalPromises.push(vectorPromise, textPromise);
  });

  const dbResults = await Promise.all(retrievalPromises);
  const dbTime = Date.now() - dbStartTime;

  interface FusedChunk extends RetrievedChunk {
    rrfScore: number;
  }

  const chunkMap = new Map<string, FusedChunk>();

  expandedQueries.forEach((expandedQuery, idx) => {
    const vectorResults = dbResults[idx * 2];
    const textResults = dbResults[idx * 2 + 1];

    vectorResults.forEach((row: Record<string, unknown>, rankIdx: number) => {
      const rank = rankIdx + 1;
      const id = row.id as string;
      if (!chunkMap.has(id)) {
        chunkMap.set(id, {
          id,
          content: row.content as string,
          pageNumber: row.page_number as number,
          chunkIndex: row.chunk_index as number,
          filename: row.filename as string,
          rrfScore: 0,
          vectorRank: rank,
          textRank: null,
          sourceQueries: [],
        });
      }
      const item = chunkMap.get(id)!;
      item.rrfScore += 1.0 / (rrfConstant + rank);
      if (item.vectorRank === null || rank < item.vectorRank) item.vectorRank = rank;
      if (!item.sourceQueries.includes(expandedQuery)) item.sourceQueries.push(expandedQuery);
    });

    textResults.forEach((row: Record<string, unknown>, rankIdx: number) => {
      const rank = rankIdx + 1;
      const id = row.id as string;
      if (!chunkMap.has(id)) {
        chunkMap.set(id, {
          id,
          content: row.content as string,
          pageNumber: row.page_number as number,
          chunkIndex: row.chunk_index as number,
          filename: row.filename as string,
          rrfScore: 0,
          vectorRank: null,
          textRank: rank,
          sourceQueries: [],
        });
      }
      const item = chunkMap.get(id)!;
      item.rrfScore += 1.0 / (rrfConstant + rank);
      if (item.textRank === null || rank < item.textRank) item.textRank = rank;
      if (!item.sourceQueries.includes(expandedQuery)) item.sourceQueries.push(expandedQuery);
    });
  });

  const sortedChunks = Array.from(chunkMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);
  let topChunks = sortedChunks.slice(0, topK);

  if (topChunks.length === 0) {
    const fallbackChunks = useDocFilter
      ? await sql`
          SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, d.filename
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE d.id = ANY(${documentIds})
          ORDER BY d.id, dc.chunk_index ASC
          LIMIT 8
        `
      : await sql`
          SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, d.filename
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          ORDER BY d.uploaded_at DESC, dc.chunk_index ASC
          LIMIT 8
        `;

    if (fallbackChunks.length > 0) {
      topChunks = fallbackChunks.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        content: c.content as string,
        pageNumber: c.page_number as number,
        chunkIndex: c.chunk_index as number,
        filename: c.filename as string,
        rrfScore: 0.1,
        vectorRank: null,
        textRank: null,
        sourceQueries: [query],
      }));
    }
  }

  const formatChunk = (c: FusedChunk): RetrievedChunk => ({
    id: c.id,
    content: c.content,
    pageNumber: c.pageNumber,
    filename: c.filename,
    chunkIndex: c.chunkIndex,
    rrfScore: Number(c.rrfScore.toFixed(5)),
    vectorRank: c.vectorRank,
    textRank: c.textRank,
    sourceQueries: c.sourceQueries,
  });

  const displayChunks = (sortedChunks.length > 0 ? sortedChunks.slice(0, 15) : topChunks).map(formatChunk);

  return {
    originalQuery: query,
    expandedQueries,
    embeddingTimeMs: embeddingTime,
    dbRetrievalTimeMs: dbTime,
    totalChunksFound: Math.max(sortedChunks.length, topChunks.length),
    retrievedChunks: displayChunks,
    topChunks: topChunks.map(formatChunk),
    totalLatencyMs: Date.now() - startTime,
  };
}
