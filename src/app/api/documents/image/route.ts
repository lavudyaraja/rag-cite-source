import fs from 'fs';
import { NextResponse } from 'next/server';
import { resolveDocumentImagePath } from '@/lib/document-assets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET: Serves an extracted document image.
 * Route: /api/documents/image?id=UUID&page=1&index=0
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const index = parseInt(searchParams.get('index') || '0', 10);

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    const filePath = resolveDocumentImagePath(id, page, index);
    if (!filePath || !fs.existsSync(filePath)) {
      return new Response('Image not found', { status: 404 });
    }

    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
          ? 'image/gif'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/png';

    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load image';
    return new Response(message, { status: 500 });
  }
}
