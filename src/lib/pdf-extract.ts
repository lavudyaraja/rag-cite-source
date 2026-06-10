import type { ImageResult, TableResult } from 'pdf-parse';

/** Normalized PDF text shape used by the parser pipeline. */
export interface PdfTextResult {
  total: number;
  text: string;
  pages: Array<{ num: number; text: string }>;
}

function toUint8Array(buffer: Buffer): Uint8Array {
  const data = new Uint8Array(buffer.byteLength);
  data.set(buffer);
  return data;
}

/**
 * Serverless-safe text extraction via unpdf (no workers / native canvas).
 * Works on Vercel, local dev, and Node 18+.
 */
async function extractPdfTextWithUnpdf(buffer: Buffer): Promise<PdfTextResult> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(toUint8Array(buffer));

  try {
    const { totalPages, text: pageTexts } = await extractText(pdf, { mergePages: false });
    const pages = pageTexts.map((text, idx) => ({
      num: idx + 1,
      text: text.trim(),
    }));

    return {
      total: totalPages,
      text: pages.map((p) => p.text).filter(Boolean).join('\n\n'),
      pages,
    };
  } finally {
    if (typeof (pdf as { destroy?: () => void }).destroy === 'function') {
      (pdf as { destroy: () => void }).destroy();
    }
  }
}

/**
 * pdf-parse path for local table/image extraction only.
 */
async function loadPdfParse() {
  await import('pdf-parse/worker');
  return import('pdf-parse');
}

/**
 * Extract PDF page text. Uses unpdf everywhere (reliable on Vercel serverless).
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  if (!buffer?.length) {
    throw new Error('PDF file is empty');
  }

  try {
    const result = await extractPdfTextWithUnpdf(buffer);
    if (result.pages.some((p) => p.text.length > 0) || result.text.trim().length > 0) {
      return result;
    }
    throw new Error('No extractable text in PDF');
  } catch (unpdfErr) {
    console.warn('unpdf text extraction failed, trying pdf-parse:', unpdfErr);

    if (process.env.VERCEL) {
      throw unpdfErr;
    }

    try {
      const { PDFParse } = await loadPdfParse();
      const parser = new PDFParse({ data: toUint8Array(buffer) });
      try {
        const result = await parser.getText();
        return {
          total: result.total,
          text: result.text,
          pages: result.pages.map((p) => ({ num: p.num, text: p.text })),
        };
      } finally {
        await parser.destroy().catch(() => {});
      }
    } catch (parseErr) {
      console.error('pdf-parse fallback also failed:', parseErr);
      throw unpdfErr;
    }
  }
}

/**
 * Table extraction — local only (pdf-parse worker issues on Vercel).
 */
export async function extractPdfTables(buffer: Buffer): Promise<TableResult | null> {
  if (process.env.VERCEL) return null;

  try {
    const { PDFParse } = await loadPdfParse();
    const parser = new PDFParse({ data: toUint8Array(buffer) });
    try {
      return await parser.getTable();
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err) {
    console.warn('PDF table extraction failed:', err);
    return null;
  }
}

/**
 * Image extraction — local only.
 */
export async function extractPdfImages(buffer: Buffer): Promise<ImageResult | null> {
  if (process.env.VERCEL) return null;

  try {
    const { PDFParse } = await loadPdfParse();
    const parser = new PDFParse({ data: toUint8Array(buffer) });
    try {
      return await parser.getImage({ imageBuffer: true, imageThreshold: 20 });
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err) {
    console.warn('PDF image extraction failed:', err);
    return null;
  }
}
