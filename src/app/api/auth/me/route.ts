// GET /api/auth/me — check current session
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    return NextResponse.json({
      isLoggedIn: true,
      email: session.email,
    });
  } catch (error) {
    console.error('[Auth] Session check error:', error);
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  }
}
