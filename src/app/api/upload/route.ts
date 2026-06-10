import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { ensureDocumentSchema } from '@/lib/db-schema';
import { generateDocumentCatalog } from '@/lib/document-catalog';
import { parseAndChunkFile } from '@/lib/parser';
import { getEmbeddingsBatch } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';

function getSectionKey(metadata: Record<string, unknown> | undefined, chunkIndex: number): string {
  if (metadata?.sectionKey && typeof metadata.sectionKey === 'string') {
    return metadata.sectionKey;
  }
  return `legacy-${chunkIndex}`;
}

function getContentHash(metadata: Record<string, unknown> | undefined, content: string): string {
  if (metadata?.contentHash && typeof metadata.contentHash === 'string') {
    return metadata.contentHash;
  }
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

async function insertChunkBatch(
  docId: string,
  chunks: { chunkIndex: number; pageNumber: number; content: string; metadata?: object }[],
  embeddings: (number[] | null)[]
) {
  const insertBatchSize = 50;
  for (let i = 0; i < chunks.length; i += insertBatchSize) {
    const chunkBatch = chunks.slice(i, i + insertBatchSize);

    let query = `
      INSERT INTO document_chunks (document_id, chunk_index, page_number, content, embedding, tsv, metadata)
      VALUES 
    `;

    const params: unknown[] = [];
    const valueStrings: string[] = [];

    for (let j = 0; j < chunkBatch.length; j++) {
      const offset = params.length;
      const chunkGlobalIndex = i + j;
      const embeddingVal = embeddings[chunkGlobalIndex]
        ? JSON.stringify(embeddings[chunkGlobalIndex])
        : null;

      const metadataVal = chunkBatch[j].metadata
        ? JSON.stringify(chunkBatch[j].metadata)
        : null;

      if (embeddingVal) {
        valueStrings.push(`(
          $${offset + 1}, 
          $${offset + 2}, 
          $${offset + 3}, 
          $${offset + 4}, 
          $${offset + 5}::vector, 
          to_tsvector('english', $${offset + 4}),
          $${offset + 6}::jsonb
        )`);

        params.push(
          docId,
          chunkBatch[j].chunkIndex,
          chunkBatch[j].pageNumber,
          chunkBatch[j].content,
          embeddingVal,
          metadataVal
        );
      } else {
        valueStrings.push(`(
          $${offset + 1}, 
          $${offset + 2}, 
          $${offset + 3}, 
          $${offset + 4}, 
          NULL, 
          to_tsvector('english', $${offset + 4}),
          $${offset + 5}::jsonb
        )`);

        params.push(
          docId,
          chunkBatch[j].chunkIndex,
          chunkBatch[j].pageNumber,
          chunkBatch[j].content,
          metadataVal
        );
      }
    }

    query += valueStrings.join(', ');
    await (sql as any).query(query, params);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDocumentSchema();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
    const filenameLower = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => filenameLower.endsWith(ext));

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Supported formats: PDF, DOCX, TXT, MD, CSV, JSON' },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds the 20 MB limit' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const existingDocs = await sql`
      SELECT id, file_hash FROM documents WHERE filename = ${file.name} LIMIT 1
    `;
    const isReupload = existingDocs.length > 0;
    const existingDocId = isReupload ? existingDocs[0].id : null;

    if (isReupload && existingDocs[0].file_hash === fileHash) {
      return NextResponse.json({
        success: true,
        documentId: existingDocId,
        filename: file.name,
        chunksIndexed: 0,
        incremental: true,
        unchanged: true,
        message: 'File unchanged — skipped re-indexing',
      });
    }

    const { chunks, tablesExtracted, imagesCaptioned } = await parseAndChunkFile(buffer, file.name);

    if (chunks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not extract text from this file' },
        { status: 400 }
      );
    }

    const catalog = await generateDocumentCatalog(
      file.name,
      chunks.map((c) => c.content)
    );

    let docId: string;
    let chunksToEmbed = chunks;
    let unchangedCount = 0;
    let deletedCount = 0;

    if (isReupload && existingDocId) {
      docId = existingDocId;

      const existingChunks = await sql`
        SELECT id, content, metadata, chunk_index FROM document_chunks WHERE document_id = ${docId}
      `;

      const unchangedKeys = new Set<string>();
      const existingBySection = new Map<string, { id: string; contentHash: string }>();

      for (const row of existingChunks) {
        const meta = (row.metadata as Record<string, unknown>) || {};
        const sectionKey = getSectionKey(meta, row.chunk_index ?? 0);
        const contentHash = getContentHash(meta, row.content || '');
        existingBySection.set(sectionKey, { id: row.id, contentHash });
      }

      for (const chunk of chunks) {
        const meta = (chunk.metadata as Record<string, unknown>) || {};
        const sectionKey = getSectionKey(meta, chunk.chunkIndex);
        const contentHash = getContentHash(meta, chunk.content);
        const existing = existingBySection.get(sectionKey);
        if (existing && existing.contentHash === contentHash) {
          unchangedKeys.add(sectionKey);
        }
      }

      unchangedCount = unchangedKeys.size;
      chunksToEmbed = chunks.filter((c) => {
        const meta = (c.metadata as Record<string, unknown>) || {};
        const sectionKey = getSectionKey(meta, c.chunkIndex);
        return !unchangedKeys.has(sectionKey);
      });

      const idsToDelete = existingChunks
        .filter((row) => {
          const meta = (row.metadata as Record<string, unknown>) || {};
          const sectionKey = getSectionKey(meta, row.chunk_index ?? 0);
          return !unchangedKeys.has(sectionKey);
        })
        .map((row) => row.id);

      if (idsToDelete.length > 0) {
        await (sql as any).query(
          `DELETE FROM document_chunks WHERE id = ANY($1::uuid[])`,
          [idsToDelete]
        );
        deletedCount = idsToDelete.length;
      }

      await sql`
        UPDATE documents
        SET file_size = ${file.size},
            chunk_count = ${chunks.length},
            file_hash = ${fileHash},
            summary = ${catalog.summary},
            tags = ${JSON.stringify(catalog.tags)}::jsonb,
            uploaded_at = NOW()
        WHERE id = ${docId}
      `;
    } else {
      const docResult = await sql`
        INSERT INTO documents (filename, file_size, chunk_count, file_hash, summary, tags)
        VALUES (
          ${file.name},
          ${file.size},
          ${chunks.length},
          ${fileHash},
          ${catalog.summary},
          ${JSON.stringify(catalog.tags)}::jsonb
        )
        RETURNING id
      `;
      docId = docResult[0].id;
    }

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, `${docId}.${extension}`);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.error('Failed to save file to public disk:', fsErr);
    }

    const chunkTexts = chunksToEmbed.map((c) => c.content);
    const embeddings: (number[] | null)[] = [];

    if (chunkTexts.length > 0) {
      try {
        const batchSize = 50;
        for (let i = 0; i < chunkTexts.length; i += batchSize) {
          const textBatch = chunkTexts.slice(i, i + batchSize);
          const batchEmbeds = await getEmbeddingsBatch(textBatch);
          embeddings.push(...batchEmbeds);
        }
        console.log(`Generated ${embeddings.length} embeddings for ${file.name}`);
      } catch (embErr) {
        console.error('Failed to generate embeddings during upload:', embErr);
      }
    }

    if (chunksToEmbed.length > 0) {
      await insertChunkBatch(docId, chunksToEmbed, embeddings);
    }

    return NextResponse.json({
      success: true,
      documentId: docId,
      filename: file.name,
      chunksIndexed: chunksToEmbed.length,
      totalChunks: chunks.length,
      tablesExtracted,
      imagesCaptioned,
      summary: catalog.summary,
      tags: catalog.tags,
      incremental: isReupload,
      unchangedChunks: unchangedCount,
      deletedChunks: deletedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to parse and upload document';
    console.error('Error in upload handler:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
