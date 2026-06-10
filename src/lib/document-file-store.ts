import fs from 'fs';
import path from 'path';
import { sql } from './db';
import { getUploadsRoot } from './document-assets';

const KNOWN_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'csv', 'json'];

function extensionFromFilename(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || 'bin';
}

function contentTypeForExtension(ext: string): string {
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'md':
      return 'text/markdown; charset=utf-8';
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Saves original upload bytes to disk (fast local cache).
 */
export function saveDocumentFileToDisk(
  docId: string,
  buffer: Buffer,
  extension: string
): string {
  const uploadsDir = getUploadsRoot();
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, `${docId}.${extension}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Resolves a document file on disk — files only, never subdirectories.
 */
export function resolveDocumentFileOnDisk(docId: string): {
  buffer: Buffer;
  extension: string;
  filename: string;
} | null {
  const uploadsDir = getUploadsRoot();
  if (!fs.existsSync(uploadsDir)) return null;

  for (const ext of KNOWN_EXTENSIONS) {
    const filePath = path.join(uploadsDir, `${docId}.${ext}`);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return {
        buffer: fs.readFileSync(filePath),
        extension: ext,
        filename: `${docId}.${ext}`,
      };
    }
  }

  const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
  const match = entries.find(
    (entry) => entry.isFile() && entry.name.startsWith(`${docId}.`)
  );
  if (!match) return null;

  const ext = match.name.split('.').pop()?.toLowerCase() || 'bin';
  return {
    buffer: fs.readFileSync(path.join(uploadsDir, match.name)),
    extension: ext,
    filename: match.name,
  };
}

/**
 * Persists original file in Neon (base64) + local disk when possible.
 */
export async function saveDocumentFile(
  docId: string,
  buffer: Buffer,
  originalFilename: string
): Promise<void> {
  const extension = extensionFromFilename(originalFilename);
  const base64 = buffer.toString('base64');

  await sql`
    UPDATE documents
    SET file_data_base64 = ${base64},
        file_extension = ${extension}
    WHERE id = ${docId}
  `;

  try {
    saveDocumentFileToDisk(docId, buffer, extension);
  } catch (err) {
    console.warn('Failed to cache document on disk:', err);
  }
}

/**
 * Loads original file — disk cache first, then database.
 */
export async function loadDocumentFile(docId: string): Promise<{
  buffer: Buffer;
  extension: string;
  filename: string;
  contentType: string;
} | null> {
  const fromDisk = resolveDocumentFileOnDisk(docId);
  if (fromDisk) {
    return {
      ...fromDisk,
      contentType: contentTypeForExtension(fromDisk.extension),
    };
  }

  const rows = await sql`
    SELECT filename, file_extension, file_data_base64
    FROM documents
    WHERE id = ${docId}
    LIMIT 1
  `;

  const row = rows[0] as
    | {
        filename: string;
        file_extension: string | null;
        file_data_base64: string | null;
      }
    | undefined;

  if (!row?.file_data_base64) return null;

  const extension = row.file_extension || extensionFromFilename(row.filename);
  const buffer = Buffer.from(row.file_data_base64, 'base64');

  try {
    saveDocumentFileToDisk(docId, buffer, extension);
  } catch {
    /* disk cache optional */
  }

  return {
    buffer,
    extension,
    filename: row.filename,
    contentType: contentTypeForExtension(extension),
  };
}
