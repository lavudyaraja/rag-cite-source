import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieves the text chunks of a document to display in the Document Viewer.
 * Route: /api/documents/content?id=UUID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Fetch chunks sorted by their index to reconstruct the document
    const rows = await sql`
      SELECT chunk_index, page_number, content, metadata
      FROM document_chunks
      WHERE document_id = ${id}
      ORDER BY chunk_index ASC
    `;

    const chunks = rows.map((row) => {
      let metadata = row.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch {
          metadata = null;
        }
      }
      return { ...row, metadata };
    });

    return NextResponse.json({ success: true, chunks });
  } catch (error: any) {
    console.error('Error fetching document content:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch document content' },
      { status: 500 }
    );
  }
}
