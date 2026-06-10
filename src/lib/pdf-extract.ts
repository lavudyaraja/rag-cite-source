import type { TableResult } from 'pdf-parse';
import type { ExtractedImage } from './image-captioning';

/** Normalized PDF text shape used by the parser pipeline. */
export interface PdfTextResult {
  total: number;
  text: string;
  pages: Array<{ num: number; text: string }>;
}

const MIN_IMAGE_PIXELS = 20 * 20;
const MAX_PAGES_FOR_IMAGES = process.env.VERCEL ? 40 : 120;

function toUint8Array(buffer: Buffer): Uint8Array {
  const data = new Uint8Array(buffer.byteLength);
  data.set(buffer);
  return data;
}

/**
 * Serverless-safe text extraction via unpdf.
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

async function loadPdfParse() {
  await import('pdf-parse/worker');
  return import('pdf-parse');
}

/**
 * Extract embedded images from PDF pages using unpdf (works on Vercel).
 */
export async function extractPdfEmbeddedImages(buffer: Buffer): Promise<ExtractedImage[]> {
  if (!buffer?.length) return [];

  try {
    const { extractImages, getDocumentProxy } = await import('unpdf');
    const sharp = (await import('sharp')).default;
    const pdf = await getDocumentProxy(toUint8Array(buffer));
    const numPages = Math.min(pdf.numPages, MAX_PAGES_FOR_IMAGES);
    const images: ExtractedImage[] = [];
    let globalIndex = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      let pageImages: Awaited<ReturnType<typeof extractImages>> = [];
      try {
        pageImages = await extractImages(pdf, pageNum);
      } catch (pageErr) {
        console.warn(`Image extraction failed for page ${pageNum}:`, pageErr);
        continue;
      }

      for (const img of pageImages) {
        if (img.width * img.height < MIN_IMAGE_PIXELS) continue;
        if (img.width < 20 || img.height < 20) continue;

        try {
          const channels = img.channels as 1 | 2 | 3 | 4;
          const pngBuffer = await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), {
            raw: {
              width: img.width,
              height: img.height,
              channels,
            },
          })
            .png()
            .toBuffer();

          images.push({
            buffer: pngBuffer,
            mimeType: 'image/png',
            pageNumber: pageNum,
            imageIndex: globalIndex++,
            width: img.width,
            height: img.height,
            name: img.key,
          });
        } catch (encodeErr) {
          console.warn(`Failed to encode image on page ${pageNum}:`, encodeErr);
        }
      }
    }

    if (typeof (pdf as { destroy?: () => void }).destroy === 'function') {
      (pdf as { destroy: () => void }).destroy();
    }

    return images;
  } catch (err) {
    console.warn('unpdf image extraction failed:', err);

    if (process.env.VERCEL) return [];

    try {
      const { PDFParse } = await loadPdfParse();
      const parser = new PDFParse({ data: toUint8Array(buffer) });
      try {
        const imageResult = await parser.getImage({ imageBuffer: true, imageThreshold: 20 });
        const fallback: ExtractedImage[] = [];
        let globalImageIndex = 0;
        if (imageResult?.pages) {
          for (const page of imageResult.pages) {
            for (const img of page.images) {
              if (!img.data || img.data.length === 0) continue;
              fallback.push({
                buffer: Buffer.from(img.data),
                mimeType: 'image/png',
                pageNumber: page.pageNumber,
                imageIndex: globalImageIndex++,
                width: img.width,
                height: img.height,
                name: img.name,
              });
            }
          }
        }
        return fallback;
      } finally {
        await parser.destroy().catch(() => {});
      }
    } catch (parseErr) {
      console.warn('pdf-parse image fallback failed:', parseErr);
      return [];
    }
  }
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
