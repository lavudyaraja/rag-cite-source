import { loadDocumentFile } from '@/lib/document-file-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET: Streams the original uploaded document (PDF, DOCX, etc.).
 * Route: /api/documents/file?id=UUID#page=N
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Document ID is required', { status: 400 });
    }

    const file = await loadDocumentFile(id);
    if (!file) {
      return new Response(
        'Original file not found. Please re-upload this document once to restore the PDF preview.',
        { status: 404 }
      );
    }

    return new Response(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error streaming file:', error);
    return new Response(message, { status: 500 });
  }
}
