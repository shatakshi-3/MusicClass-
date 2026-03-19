// POST /api/auth/login — authenticate admin
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData, checkRateLimit, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rateCheck.retryAfterSeconds}s` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Input validation
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (email.length > 254 || password.length > 128) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Check credentials using bcrypt verification
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@music.com';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || '';

    if (email !== adminEmail) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // If a bcrypt hash is provided, verify against it; otherwise fall back to plain text comparison
    let passwordValid = false;
    if (adminPasswordHash && adminPasswordHash.startsWith('$2')) {
      passwordValid = await verifyPassword(password, adminPasswordHash);
    } else {
      // Fallback for dev: plain text comparison (set ADMIN_PASSWORD_HASH in production)
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      passwordValid = password === adminPassword;
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.isLoggedIn = true;
    session.email = email;
    await session.save();

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
