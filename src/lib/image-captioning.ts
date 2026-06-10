import { ai, retryWithBackoff } from './gemini';

const MAX_IMAGES_PER_DOCUMENT = 100;
const CAPTION_CONCURRENCY = 4;

export interface ExtractedImage {
  buffer: Buffer;
  mimeType: string;
  pageNumber: number;
  imageIndex: number;
  width?: number;
  height?: number;
  name?: string;
}

/**
 * Detects image MIME type from magic bytes.
 */
export function detectImageMimeType(data: Uint8Array): string {
  if (data.length >= 4 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return 'image/png';
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (data.length >= 3 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return 'image/gif';
  }
  if (data.length >= 4 && data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
    return 'image/webp';
  }
  return 'image/png';
}

/**
 * Uses Gemini Vision to generate a descriptive caption for an image.
 */
export async function captionImage(
  imageBuffer: Buffer,
  mimeType: string,
  context?: { pageNumber?: number; filename?: string }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    return 'Image caption unavailable (GEMINI_API_KEY not configured).';
  }

  const base64 = imageBuffer.toString('base64');
  const contextHint = context?.pageNumber
    ? `This image is from page ${context.pageNumber} of the document.`
    : '';

  try {
    const response = await retryWithBackoff(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64,
              mimeType,
            },
          },
          `You are a document analysis assistant. Describe this image in detail for a RAG search index.
${contextHint}
Focus on: chart titles, axis labels, data trends, diagram components, tables visible in the image, and any readable text.
Write 2-4 concise sentences. Do not start with "This image shows" — begin directly with the content.`,
        ],
      })
    );

    return response.text?.trim() || 'Unable to generate image caption.';
  } catch (error) {
    console.error('Image captioning failed:', error);
    return 'Image caption generation failed.';
  }
}

/**
 * Builds searchable chunk text from an image caption.
 */
export function formatImageCaptionContent(
  caption: string,
  pageNumber: number,
  imageIndex: number,
  meta?: { width?: number; height?: number; name?: string }
): string {
  const dims =
    meta?.width && meta?.height ? ` (${meta.width}×${meta.height}px)` : '';
  const label = meta?.name ? ` — ${meta.name}` : '';

  return [
    `[Image Caption — Page ${pageNumber}, Image ${imageIndex + 1}${label}${dims}]`,
    '',
    caption,
  ].join('\n');
}

/**
 * Caps the number of images processed per document to control API cost.
 */
export function limitImages(images: ExtractedImage[]): ExtractedImage[] {
  return images.slice(0, MAX_IMAGES_PER_DOCUMENT);
}

/**
 * Caption images with bounded concurrency to process all figures in large PDFs.
 */
export async function captionImagesBatch(
  images: ExtractedImage[],
  captionFn: (image: ExtractedImage) => Promise<string>
): Promise<string[]> {
  const results: string[] = new Array(images.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < images.length) {
      const idx = cursor++;
      results[idx] = await captionFn(images[idx]);
    }
  };

  const workers = Array.from(
    { length: Math.min(CAPTION_CONCURRENCY, images.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
