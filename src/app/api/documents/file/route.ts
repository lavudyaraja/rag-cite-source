import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET: Streams an uploaded document file from disk dynamically based on document ID.
 * Bypasses Next.js static asset caching issues so that newly uploaded files preview instantly.
 * Route: /api/documents/file?id=UUID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Document ID is required', { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return new Response('Uploads directory not found', { status: 404 });
    }

    // Find the file on disk starting with the document ID
    const diskFiles = fs.readdirSync(uploadsDir);
    const targetFile = diskFiles.find((f) => f.startsWith(id));

    if (!targetFile) {
      return new Response('File not found on disk', { status: 404 });
    }

    const filePath = path.join(uploadsDir, targetFile);
    if (!fs.existsSync(filePath)) {
      return new Response('File not found', { status: 404 });
    }

    // Read file binary
    const fileBuffer = fs.readFileSync(filePath);
    
    // Set appropriate content type based on file extension
    const ext = targetFile.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === 'pdf') {
      contentType = 'application/pdf';
    } else if (ext === 'txt') {
      contentType = 'text/plain; charset=utf-8';
    } else if (ext === 'md') {
      contentType = 'text/markdown; charset=utf-8';
    } else if (ext === 'csv') {
      contentType = 'text/csv; charset=utf-8';
    } else if (ext === 'json') {
      contentType = 'application/json; charset=utf-8';
    }

    // Return the binary data streamed directly to the browser
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${targetFile}"`,
      },
    });
  } catch (error: any) {
    console.error('Error streaming file:', error);
    return new Response(error.message || 'Internal server error during file stream', { status: 500 });
  }
}
