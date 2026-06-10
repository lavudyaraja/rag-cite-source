import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getEmbeddingsBatch } from '@/lib/gemini';
import { expandQuery, streamChatCompletion } from '@/lib/llm-provider';
import { logQueryMetrics } from '@/lib/analytics';
import { calculateTokenUsage } from '@/lib/token-cost';
import {
  createStaticSSEStream,
  createErrorSSEStream,
  NO_DOCUMENTS_MESSAGE,
  NO_CONTENT_MESSAGE,
} from '@/lib/query-stream';
import { formatUserFacingError, isQuotaExceededError } from '@/lib/gemini-errors';

export const dynamic = 'force-dynamic';

function resolveContextContent(content: string, metadata: unknown): string {
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    const parent = (metadata as Record<string, unknown>).parentContent;
    if (typeof parent === 'string' && parent.trim().length > 0) {
      return parent;
    }
  }
  return content;
}

export async function POST(request: Request) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const nvidiaKey = process.env.NVIDIA_API_KEY || '';
    if (!geminiKey && !nvidiaKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Configure GEMINI_API_KEY and/or NVIDIA_API_KEY in .env.local (Gemini is used first; NVIDIA Qwen is the fallback).',
        },
        { status: 400 }
      );
    }

    const { query, documentIds, topK = 5, rrfConstant = 60 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query string is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    const emptyTrace = (extra: Record<string, unknown> = {}) => ({
      originalQuery: query,
      expandedQueries: [query],
      embeddingTimeMs: 0,
      dbRetrievalTimeMs: 0,
      llmStreamTimeMs: 0,
      totalChunksFound: 0,
      retrievedChunks: [],
      totalLatencyMs: Date.now() - startTime,
      ...extra,
    });

    const [{ count: totalDocs }] = await sql`SELECT COUNT(*)::int as count FROM documents`;
    if (totalDocs === 0) {
      return createStaticSSEStream(NO_DOCUMENTS_MESSAGE, emptyTrace({ noDocuments: true }));
    }

    const lowercaseQuery = query.toLowerCase().trim();

    // Helper to check if query contains any of the search terms
    const containsAny = (text: string, terms: string[]): boolean => {
      return terms.some(term => text.includes(term));
    };

    // 1. Check if the user is asking to list/see available documents
    const isListQuery = 
      containsAny(lowercaseQuery, [
        'list of pdf',
        'list pdf',
        'show pdf',
        'list of doc',
        'list doc',
        'show doc',
        'list of file',
        'list file',
        'show file',
        'read doc',
        'read file',
        'what doc',
        'what file',
        'what pdf',
        'get doc',
        'get file',
        'get pdf',
        'available doc',
        'available file',
        'available pdf',
      ]) ||
      lowercaseQuery === 'pdfs' ||
      lowercaseQuery === 'documents' ||
      lowercaseQuery === 'files' ||
      lowercaseQuery === 'pdf' ||
      lowercaseQuery === 'document' ||
      lowercaseQuery === 'file';

    if (isListQuery) {
      const dbRetrievalStart = Date.now();
      const docs = await sql`
        SELECT id, filename, file_size, chunk_count, uploaded_at 
        FROM documents 
        ORDER BY uploaded_at DESC
      `;
      const dbRetrievalTime = Date.now() - dbRetrievalStart;
      
      const trace = {
        originalQuery: query,
        expandedQueries: [query],
        embeddingTimeMs: 0,
        dbRetrievalTimeMs: dbRetrievalTime,
        totalChunksFound: 0,
        retrievedChunks: [],
        totalLatencyMs: Date.now() - startTime,
      };

      // Log metrics to DB asynchronously
      logQueryMetrics({
        query: 'List documents',
        latencyMs: Date.now() - startTime,
        embeddingTimeMs: 0,
        dbTimeMs: dbRetrievalTime,
        totalChunks: docs.length
      }).catch(err => console.error('Failed to log query metrics:', err));

      let docListString = '';
      if (docs.length === 0) {
        docListString = 'No documents found in the database. Please upload some PDFs using the left panel.';
      } else {
        docs.forEach((doc: any, i: number) => {
          docListString += `${i + 1}. **${doc.filename}** (${(doc.file_size / 1024 / 1024).toFixed(2)} MB, ${doc.chunk_count} chunks, uploaded on ${new Date(doc.uploaded_at).toLocaleDateString()})\n`;
        });
      }

      const prompt = `The user is asking to see the list of uploaded documents or files.
Here is the raw list of documents in the database:
${docListString}

Respond to the user by listing these documents nicely. If documents exist, encourage the user to select them in the document panel on the left (or select them to analyze them). Keep your response professional, user-friendly, and concise. Do NOT cite any source numbers since these are not chunks.`;

      const responseStreamEncoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(
              responseStreamEncoder.encode(`event: trace\ndata: ${JSON.stringify(trace)}\n\n`)
            );
            for await (const { text } of streamChatCompletion({
              prompt,
              systemInstruction:
                'You are PdfParseRag. Politely list the available documents and tell the user they can select them to analyze.',
            })) {
              controller.enqueue(
                responseStreamEncoder.encode(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`)
              );
            }
            controller.enqueue(responseStreamEncoder.encode(`event: done\ndata: [DONE]\n\n`));
          } catch (err: any) {
            console.error('Streaming error in list query:', err);
            controller.enqueue(
              responseStreamEncoder.encode(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 2. Check if it's a generic document analysis query (e.g. "read the document", "hi document check", "summarize", etc.)
    const isGenericDocQuery = (q: string): boolean => {
      const lq = q.toLowerCase().trim();
      
      const genericKeywords = [
        'read the doc',
        'read doc',
        'read the pdf',
        'read pdf',
        'read the file',
        'read file',
        'analyze the doc',
        'analyze doc',
        'analyze the pdf',
        'analyze pdf',
        'analyze the file',
        'analyze file',
        'summarize the doc',
        'summarize doc',
        'summarize the pdf',
        'summarize pdf',
        'summarize the file',
        'summarize file',
        'explain this doc',
        'explain the doc',
        'explain this pdf',
        'explain the pdf',
        'explain this file',
        'explain the file',
        'what is this doc',
        'what is this pdf',
        'what is this file',
        'what is this about',
        'tell me about this',
        'tell me about the pdf',
        'tell me about the file',
        'document check',
        'pdf check',
        'file check',
        'check document',
        'check pdf',
        'check file',
      ];
      
      const exactKeywords = [
        'read',
        'analyze',
        'summarize',
        'summary',
        'explain',
        'read it',
        'analyze it',
        'summarize it',
        'explain it',
        'read it okay',
        'read the document okay',
        'read the pdf okay',
        'read the file okay',
      ];

      return containsAny(lq, genericKeywords) || exactKeywords.includes(lq);
    };

    if (isGenericDocQuery(query)) {
      // Resolve document IDs: if none are selected, retrieve the most recently uploaded document
      let targetDocIds = documentIds;
      if (!Array.isArray(targetDocIds) || targetDocIds.length === 0) {
        const recentDocs = await sql`
          SELECT id FROM documents 
          ORDER BY uploaded_at DESC 
          LIMIT 1
        `;
        if (recentDocs.length > 0) {
          targetDocIds = [recentDocs[0].id];
        }
      }

      if (Array.isArray(targetDocIds) && targetDocIds.length > 0) {
        const initialChunks = await sql`
          SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, d.filename
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE d.id = ANY(${targetDocIds})
            AND dc.chunk_index < 8
          ORDER BY d.id, dc.chunk_index ASC
        `;

        if (initialChunks.length > 0) {
        const dbTimeMsVal = Date.now() - startTime;
        const trace = {
          originalQuery: query,
          expandedQueries: [query],
          embeddingTimeMs: 0,
          dbRetrievalTimeMs: dbTimeMsVal,
          totalChunksFound: initialChunks.length,
          retrievedChunks: initialChunks.map((c: any) => ({
            id: c.id,
            content: c.content,
            pageNumber: c.page_number,
            filename: c.filename,
            chunkIndex: c.chunk_index,
            rrfScore: 1.0,
            vectorRank: 1,
            textRank: 1,
            sourceQueries: [query],
          })),
          totalLatencyMs: Date.now() - startTime,
        };

        // Log metrics to DB asynchronously
        logQueryMetrics({
          query: query,
          latencyMs: Date.now() - startTime,
          embeddingTimeMs: 0,
          dbTimeMs: dbTimeMsVal,
          totalChunks: initialChunks.length
        }).catch(err => console.error('Failed to log query metrics:', err));

        const contextText = initialChunks
          .map(
            (c: any, idx: number) =>
              `[Source ${idx + 1}] File: ${c.filename}, Page: ${c.page_number}\n${c.content}`
          )
          .join('\n\n');

        const prompt = `Answer the user's question based strictly on the context provided below. If the answer cannot be found in the context, say that you don't know based on the documents. Always cite your sources in the text using [Source 1], [Source 2], etc., when referring to information.

Context:
${contextText}

Question: ${query}`;

        const responseStreamEncoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              controller.enqueue(
                responseStreamEncoder.encode(`event: trace\ndata: ${JSON.stringify(trace)}\n\n`)
              );

              for await (const { text } of streamChatCompletion({
                prompt,
                systemInstruction:
                  'You are PdfParseRag, an advanced AI research assistant. Provide clear, accurate answers citing source brackets like [Source 1]. Stay concise.',
              })) {
                controller.enqueue(
                  responseStreamEncoder.encode(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`)
                );
              }

              controller.enqueue(responseStreamEncoder.encode(`event: done\ndata: [DONE]\n\n`));
            } catch (err: any) {
              console.error('Streaming error in generic doc query:', err);
              controller.enqueue(
                responseStreamEncoder.encode(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
              );
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
      }
    }

    const expandedQueries = await expandQuery(query);

    const embeddingStartTime = Date.now();
    let queryEmbeddings: number[][];
    let embeddingTime: number;
    try {
      queryEmbeddings = await getEmbeddingsBatch(expandedQueries);
      embeddingTime = Date.now() - embeddingStartTime;
    } catch (embedErr) {
      return createErrorSSEStream(embedErr, emptyTrace({ stage: 'embedding' }));
    }

    // 3. Parallel Database Retrieval (Vector and Full-Text Search for each query)
    const dbStartTime = Date.now();
    const useDocFilter = Array.isArray(documentIds) && documentIds.length > 0;
    const retrievalPromises: Promise<any>[] = [];

    expandedQueries.forEach((expandedQuery, idx) => {
      const vector = queryEmbeddings[idx];
      const vectorJson = JSON.stringify(vector);

      // A. Vector Search Promise
      const vectorPromise = useDocFilter
        ? sql`
            SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, dc.metadata, d.filename,
                   (dc.embedding <=> ${vectorJson}::vector) as distance
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.id = ANY(${documentIds})
              AND dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> ${vectorJson}::vector
            LIMIT 30
          `
        : sql`
            SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, dc.metadata, d.filename,
                   (dc.embedding <=> ${vectorJson}::vector) as distance
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> ${vectorJson}::vector
            LIMIT 30
          `;

      // B. Full-Text Search Promise
      const textPromise = useDocFilter
        ? sql`
            SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, dc.metadata, d.filename,
                   ts_rank_cd(dc.tsv, plainto_tsquery('english', ${expandedQuery})) as keyword_score
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.tsv @@ plainto_tsquery('english', ${expandedQuery})
              AND d.id = ANY(${documentIds})
            ORDER BY keyword_score DESC
            LIMIT 30
          `
        : sql`
            SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, dc.metadata, d.filename,
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

    // 4. Reciprocal Rank Fusion (RRF) scoring in JavaScript
    // We group chunks by id and compute RRF scores.
    interface FusedChunk {
      id: string;
      content: string;
      contextContent: string;
      pageNumber: number;
      chunkIndex: number;
      filename: string;
      rrfScore: number;
      vectorRank: number | null;
      textRank: number | null;
      sourceQueries: string[];
    }

    const chunkMap = new Map<string, FusedChunk>();

    expandedQueries.forEach((expandedQuery, idx) => {
      const vectorResults = dbResults[idx * 2];
      const textResults = dbResults[idx * 2 + 1];

      // Fuse Vector Ranks
      vectorResults.forEach((row: any, rankIdx: number) => {
        const rank = rankIdx + 1; // 1-indexed rank
        if (!chunkMap.has(row.id)) {
          chunkMap.set(row.id, {
            id: row.id,
            content: row.content,
            contextContent: resolveContextContent(row.content, row.metadata),
            pageNumber: row.page_number,
            chunkIndex: row.chunk_index,
            filename: row.filename,
            rrfScore: 0,
            vectorRank: rank,
            textRank: null,
            sourceQueries: [],
          });
        }
        const item = chunkMap.get(row.id)!;
        item.rrfScore += 1.0 / (rrfConstant + rank);
        if (item.vectorRank === null || rank < item.vectorRank) {
          item.vectorRank = rank;
        }
        if (!item.sourceQueries.includes(expandedQuery)) {
          item.sourceQueries.push(expandedQuery);
        }
      });

      // Fuse Full-Text Ranks
      textResults.forEach((row: any, rankIdx: number) => {
        const rank = rankIdx + 1; // 1-indexed rank
        if (!chunkMap.has(row.id)) {
          chunkMap.set(row.id, {
            id: row.id,
            content: row.content,
            contextContent: resolveContextContent(row.content, row.metadata),
            pageNumber: row.page_number,
            chunkIndex: row.chunk_index,
            filename: row.filename,
            rrfScore: 0,
            vectorRank: null,
            textRank: rank,
            sourceQueries: [],
          });
        }
        const item = chunkMap.get(row.id)!;
        item.rrfScore += 1.0 / (rrfConstant + rank);
        if (item.textRank === null || rank < item.textRank) {
          item.textRank = rank;
        }
        if (!item.sourceQueries.includes(expandedQuery)) {
          item.sourceQueries.push(expandedQuery);
        }
      });
    });

    // Sort all fused chunks by their aggregated RRF score descending
    const sortedChunks = Array.from(chunkMap.values()).sort(
      (a, b) => b.rrfScore - a.rrfScore
    );

    // Take the top K chunks for the prompt context
    let topChunks = sortedChunks.slice(0, topK);

    // Fallback: If no chunks were matched through hybrid search, fetch the first few chunks of the selected/recent documents
    if (topChunks.length === 0) {
      try {
        let fallbackChunks = [];
        if (useDocFilter) {
          fallbackChunks = await sql`
            SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, dc.metadata, d.filename
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.id = ANY(${documentIds})
            ORDER BY d.id, dc.chunk_index ASC
            LIMIT 8
          `;
        } else {
          fallbackChunks = await sql`
            SELECT dc.id, dc.content, dc.page_number, dc.chunk_index, dc.metadata, d.filename
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            ORDER BY d.uploaded_at DESC, dc.chunk_index ASC
            LIMIT 8
          `;
        }
        
        if (fallbackChunks.length > 0) {
          topChunks = fallbackChunks.map((c: any) => ({
            id: c.id,
            content: c.content,
            contextContent: resolveContextContent(c.content, c.metadata),
            pageNumber: c.page_number,
            chunkIndex: c.chunk_index,
            filename: c.filename,
            rrfScore: 0.1,
            vectorRank: null,
            textRank: null,
            sourceQueries: [query],
          }));
        }
      } catch (fallbackErr) {
        console.error('Failed to retrieve fallback chunks:', fallbackErr);
      }
    }

    if (topChunks.length === 0) {
      return createStaticSSEStream(NO_CONTENT_MESSAGE, emptyTrace({ noContent: true }));
    }

    const contextText = topChunks
      .map(
        (c, idx) =>
          `[Source ${idx + 1}] File: ${c.filename}, Page: ${c.pageNumber}\n${c.contextContent || c.content}`
      )
      .join('\n\n');

    const prompt = `Answer the user's question based strictly on the context provided below. If the answer cannot be found in the context, explain what related information IS available and suggest how the user might rephrase their question. Never say "I don't know based on the documents" — be helpful and specific. Always cite your sources using [Source 1], [Source 2], etc., when referring to information.

Context:
${contextText}

Question: ${query}`;

    const trace = {
      originalQuery: query,
      expandedQueries,
      embeddingTimeMs: embeddingTime,
      dbRetrievalTimeMs: dbTime,
      llmStreamTimeMs: 0,
      totalChunksFound: Math.max(sortedChunks.length, topChunks.length),
      retrievedChunks: (sortedChunks.length > 0 ? sortedChunks.slice(0, 15) : topChunks).map((c) => ({
        id: c.id,
        content: c.content,
        pageNumber: c.pageNumber,
        filename: c.filename,
        chunkIndex: c.chunkIndex,
        rrfScore: Number(c.rrfScore.toFixed(5)),
        vectorRank: c.vectorRank,
        textRank: c.textRank,
        sourceQueries: c.sourceQueries,
      })),
      totalLatencyMs: Date.now() - startTime,
      promptContext: contextText,
    };

    logQueryMetrics({
      query,
      latencyMs: trace.totalLatencyMs,
      embeddingTimeMs: embeddingTime,
      dbTimeMs: dbTime,
      totalChunks: Math.max(sortedChunks.length, topChunks.length),
    }).catch((err) => console.error('Failed to log query metrics:', err));

    const responseStreamEncoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullAnswer = '';
        const llmStart = Date.now();

        try {
          controller.enqueue(
            responseStreamEncoder.encode(
              `event: trace\ndata: ${JSON.stringify(trace)}\n\n`
            )
          );

          let llmProvider: 'gemini' | 'nvidia' = 'gemini';

          for await (const chunk of streamChatCompletion({
            prompt,
            systemInstruction:
              'You are PdfParseRag, an advanced AI research assistant. Provide clear, accurate answers citing source brackets like [Source 1]. Stay concise.',
          })) {
            llmProvider = chunk.provider;
            fullAnswer += chunk.text;
            controller.enqueue(
              responseStreamEncoder.encode(
                `event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`
              )
            );
          }

          const llmStreamTime = Date.now() - llmStart;
          const tokenUsage = calculateTokenUsage(prompt, fullAnswer, expandedQueries);

          const enrichedTrace = {
            ...trace,
            llmStreamTimeMs: llmStreamTime,
            totalLatencyMs: Date.now() - startTime,
            tokenUsage,
            llmProvider,
          };

          controller.enqueue(
            responseStreamEncoder.encode(
              `event: metrics\ndata: ${JSON.stringify({ tokenUsage, llmStreamTimeMs: llmStreamTime })}\n\n`
            )
          );
          controller.enqueue(
            responseStreamEncoder.encode(
              `event: trace_update\ndata: ${JSON.stringify(enrichedTrace)}\n\n`
            )
          );

          controller.enqueue(
            responseStreamEncoder.encode(`event: done\ndata: [DONE]\n\n`)
          );
        } catch (err: unknown) {
          const friendly = formatUserFacingError(err);
          if (!isQuotaExceededError(err)) {
            console.error('Streaming error:', err);
          }
          controller.enqueue(
            responseStreamEncoder.encode(
              `event: chunk\ndata: ${JSON.stringify({ text: friendly })}\n\n`
            )
          );
          controller.enqueue(
            responseStreamEncoder.encode(`event: done\ndata: [DONE]\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    if (!isQuotaExceededError(error)) {
      console.error('Error in query API handler:', error);
    }
    return NextResponse.json(
      { success: false, error: formatUserFacingError(error) },
      { status: isQuotaExceededError(error) ? 429 : 500 }
    );
  }
}
