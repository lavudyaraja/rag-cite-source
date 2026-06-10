import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set in .env.local');
}

// neon() creates a serverless database client that executes individual queries over HTTP.
// This is optimal for Next.js API Routes (serverless environments).
export const sql = neon(process.env.DATABASE_URL);
