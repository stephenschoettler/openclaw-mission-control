import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'mc_session';

/**
 * Import the HMAC-SHA256 signing key using Web Crypto API (Edge-compatible).
 * Uses AUTH_SECRET env var if set, otherwise falls back to a SHA-256 digest of
 * DASHBOARD_PASSWORD (matching the logic in src/lib/auth.ts).
 */
async function getSigningKey(): Promise<CryptoKey | null> {
  try {
    let secretStr = process.env.AUTH_SECRET;
    if (!secretStr && process.env.DASHBOARD_PASSWORD) {
      // Derive key the same way src/lib/auth.ts does: sha256(password)
      const pwBytes = new TextEncoder().encode(process.env.DASHBOARD_PASSWORD) as Uint8Array<ArrayBuffer>;
      const hashBuf = await crypto.subtle.digest('SHA-256', pwBytes);
      // Convert to hex string
      secretStr = Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    if (!secretStr) secretStr = 'no-secret-configured';

    const keyData = new TextEncoder().encode(secretStr) as Uint8Array<ArrayBuffer>;
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
  } catch {
    return null;
  }
}

/** Hex-string → Uint8Array backed by a plain ArrayBuffer */
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Verify a session token created by src/lib/auth.ts using Web Crypto. */
async function verifyToken(token: string): Promise<boolean> {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;

  const payload = token.substring(0, lastDot);
  const sigHex = token.substring(lastDot + 1);

  if (!payload.startsWith('mc.') || sigHex.length !== 64) return false;

  const key = await getSigningKey();
  if (!key) return false;

  try {
    const sigBytes = hexToBytes(sigHex);
    // TextEncoder produces Uint8Array<ArrayBufferLike>; cast to satisfy SubtleCrypto types
    const payloadBytes = new TextEncoder().encode(payload) as Uint8Array<ArrayBuffer>;
    return await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // If password auth is not configured, allow everything through
  if (!process.env.DASHBOARD_PASSWORD) {
    return NextResponse.next();
  }

  // Always allow login page and auth API routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Check for valid session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  if (sessionCookie?.value) {
    const valid = await verifyToken(sessionCookie.value);
    if (valid) return NextResponse.next();
  }

  // No valid session → redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Only protect page routes — leave /api/* fully open for agent access
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
