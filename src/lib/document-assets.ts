import fs from 'fs';
import path from 'path';
import type { ExtractedImage } from './image-captioning';

export function getUploadsRoot(): string {
  return path.join(process.cwd(), 'public', 'uploads');
}

export function mimeToExtension(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

/**
 * Persists extracted PDF images under public/uploads/{docId}/images/.
 */
export function saveDocumentImages(docId: string, images: ExtractedImage[]): number {
  if (images.length === 0) return 0;

  const dir = path.join(getUploadsRoot(), docId, 'images');
  fs.mkdirSync(dir, { recursive: true });

  let saved = 0;
  for (const image of images) {
    const ext = mimeToExtension(image.mimeType);
    const filename = `p${image.pageNumber}-i${image.imageIndex}.${ext}`;
    const filePath = path.join(dir, filename);
    try {
      fs.writeFileSync(filePath, image.buffer);
      saved++;
    } catch (err) {
      console.warn(`Failed to save image ${filename}:`, err);
    }
  }
  return saved;
}

export function resolveDocumentImagePath(
  docId: string,
  pageNumber: number,
  imageIndex: number
): string | null {
  const dir = path.join(getUploadsRoot(), docId, 'images');
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  const match = files.find((f) => f === `p${pageNumber}-i${imageIndex}.png`)
    || files.find((f) => f === `p${pageNumber}-i${imageIndex}.jpg`)
    || files.find((f) => f.startsWith(`p${pageNumber}-i${imageIndex}.`));

  return match ? path.join(dir, match) : null;
}
