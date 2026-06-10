import type { ImageResult, ParseResult, TableResult } from 'pdf-parse';

function toUint8Array(buffer: Buffer): Uint8Array {
  const data = new Uint8Array(buffer.byteLength);
  data.set(buffer);
  return data;
}

async function loadPdfParse() {
  return import('pdf-parse');
}

/**
 * Extract PDF page text using a dedicated parser instance (safe for serverless).
 */
export async function extractPdfText(buffer: Buffer): Promise<ParseResult> {
  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: toUint8Array(buffer) });
  try {
    return await parser.getText();
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/**
 * Table extraction uses a separate parser instance. Unreliable when webpack-bundled.
 */
export async function extractPdfTables(buffer: Buffer): Promise<TableResult | null> {
  if (process.env.VERCEL) return null;

  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: toUint8Array(buffer) });
  try {
    return await parser.getTable();
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/**
 * Image extraction uses a separate parser instance. Skipped on Vercel (timeout + clone errors).
 */
export async function extractPdfImages(buffer: Buffer): Promise<ImageResult | null> {
  if (process.env.VERCEL) return null;

  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: toUint8Array(buffer) });
  try {
    return await parser.getImage({ imageBuffer: true, imageThreshold: 20 });
  } finally {
    await parser.destroy().catch(() => {});
  }
}
