import { NextResponse } from 'next/server';
import { signUpUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, email, password, plan = 'free' } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email and password are required.' },
        { status: 400 }
      );
    }

    const result = await signUpUser(name, email, password, plan);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'Account created successfully! Welcome to PdfParseRag.',
    });
  } catch (error: any) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed.' },
      { status: 500 }
    );
  }
}
