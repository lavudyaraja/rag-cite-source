import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureDocumentSchema } from '@/lib/db-schema';

export const dynamic = 'force-dynamic';

/**
 * GET: Lists all indexed documents.
 */
export async function GET() {
  try {
    await ensureDocumentSchema();
    const docs = await sql`
      SELECT id, filename, file_size, chunk_count, uploaded_at, summary, tags
      FROM documents 
      ORDER BY uploaded_at DESC
    `;
    
    return NextResponse.json({ success: true, documents: docs });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deletes a document by ID.
 * Triggered as /api/documents?id=UUID
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Delete the document. Foreign key cascade in database will automatically delete related chunks.
    const result = await sql`
      DELETE FROM documents 
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete static file from public/uploads disk
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const diskFiles = fs.readdirSync(uploadsDir);
        const targetFile = diskFiles.find((f: string) => f.startsWith(id));
        if (targetFile) {
          fs.unlinkSync(path.join(uploadsDir, targetFile));
        }
      }
    } catch (fsErr) {
      console.error('Failed to delete file from public disk:', fsErr);
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
