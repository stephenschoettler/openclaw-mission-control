import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, createSessionToken, isAuthEnabled } from '@/lib/auth';

const COOKIE_NAME = 'mc_session';
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // If auth is not enabled, just return ok
  if (!isAuthEnabled()) {
    return NextResponse.json({ ok: true });
  }

  let password: string;
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!checkPassword(password)) {
    // Deliberate small delay to further slow brute-force
    await new Promise(r => setTimeout(r, 300));
    return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 });
  }

  const token = createSessionToken();
  const isProduction = process.env.SECURE_COOKIES === 'true';

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: SEVEN_DAYS,
    path: '/',
  });

  return response;
}
