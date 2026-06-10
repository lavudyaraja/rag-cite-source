export const NO_DOCUMENTS_MESSAGE = `**No documents indexed yet**

To start chatting with your files:

1. Click the **Documents** icon in the toolbar above
2. Upload a PDF, DOCX, TXT, MD, CSV, or JSON file
3. Select the document(s) you want to search
4. Ask your question again

Once documents are uploaded and selected, I can search them and cite sources in my answers.`;

export const NO_CONTENT_MESSAGE = `**No searchable content found**

The selected documents don't have indexed text yet, or nothing matched your query.

**Try this:**
- Open the **Documents** panel and confirm files are uploaded
- Select one or more documents for your search scope
- Re-upload the file if indexing may have failed

Then ask your question again.`;

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

import { formatUserFacingError } from './gemini-errors';

export function createErrorSSEStream(err: unknown, trace: Record<string, unknown>): Response {
  const text = formatUserFacingError(err);
  return createStaticSSEStream(text, { ...trace, error: true });
}

export function createStaticSSEStream(text: string, trace: Record<string, unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: trace\ndata: ${JSON.stringify(trace)}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`)
      );
      controller.enqueue(encoder.encode(`event: done\ndata: [DONE]\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
