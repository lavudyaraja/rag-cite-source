import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

/**
 * Initializes the users table in Neon DB if it doesn't exist.
 */
export async function initUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

/**
 * Signs up a new user - creates account with hashed password.
 */
export async function signUpUser(
  name: string,
  email: string,
  password: string,
  plan: string = 'free'
): Promise<AuthResult> {
  try {
    await initUsersTable();

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await sql`
      INSERT INTO users (name, email, password_hash, plan)
      VALUES (${name}, ${email}, ${passwordHash}, ${plan})
      RETURNING id, name, email, plan, created_at
    `;

    const user = result[0] as User;
    return { success: true, user };
  } catch (err: any) {
    console.error('SignUp error:', err);
    return { success: false, error: err.message || 'Registration failed. Please try again.' };
  }
}

/**
 * Signs in an existing user - validates email/password.
 */
export async function signInUser(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    await initUsersTable();

    const result = await sql`
      SELECT id, name, email, password_hash, plan, created_at
      FROM users WHERE email = ${email}
    `;

    if (result.length === 0) {
      return { success: false, error: 'No account found with this email address.' };
    }

    const userRow = result[0] as any;
    const isValid = await bcrypt.compare(password, userRow.password_hash);

    if (!isValid) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const user: User = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      plan: userRow.plan,
      created_at: userRow.created_at,
    };

    return { success: true, user };
  } catch (err: any) {
    console.error('SignIn error:', err);
    return { success: false, error: err.message || 'Login failed. Please try again.' };
  }
}
