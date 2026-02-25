import crypto from 'crypto';

/** Returns the signing secret. Falls back to a SHA-256 hash of the password. */
function getSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.DASHBOARD_PASSWORD) {
    return crypto.createHash('sha256').update(process.env.DASHBOARD_PASSWORD).digest('hex');
  }
  return 'no-secret-configured';
}

/** Whether password auth is enabled. */
export function isAuthEnabled(): boolean {
  return !!process.env.DASHBOARD_PASSWORD;
}

/**
 * Timing-safe password comparison.
 * Returns true if the provided password matches DASHBOARD_PASSWORD.
 */
export function checkPassword(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return true; // no auth configured → open

  const inputBuf = Buffer.from(input, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  // Pad to the same length to avoid length-based timing leaks
  const maxLen = Math.max(inputBuf.length, expectedBuf.length);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  inputBuf.copy(a);
  expectedBuf.copy(b);

  // timingSafeEqual requires same-length buffers
  const equal = crypto.timingSafeEqual(a, b);
  // Also require lengths to match (prevents accepting padded inputs)
  return equal && inputBuf.length === expectedBuf.length;
}

/** Creates a signed session token: `payload.hmac` */
export function createSessionToken(): string {
  const payload = `mc.${Date.now()}.${crypto.randomBytes(16).toString('hex')}`;
  const secret = getSecret();
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/** Verifies a session token created by createSessionToken (Node.js side). */
export function verifySessionToken(token: string): boolean {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;

  const payload = token.substring(0, lastDot);
  const sig = token.substring(lastDot + 1);

  const secret = getSecret();
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}
