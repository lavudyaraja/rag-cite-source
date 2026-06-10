import { sql } from './db';

let schemaReady: Promise<void> | null = null;

/**
 * Ensures optional columns exist for cataloging and incremental indexing.
 */
export async function ensureDocumentSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary TEXT`;
      await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash TEXT`;
    })();
  }
  return schemaReady;
}
