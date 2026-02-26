import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { OPENCLAW_DIR, TELEGRAM_TARGET_ID } from '@/config';

export async function POST(req: NextRequest) {
  const body = await req.json() as { message?: string };
  const { message } = body;
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const target = TELEGRAM_TARGET_ID || 'telegram';
  try {
    execSync(
      `cd ${JSON.stringify(OPENCLAW_DIR)} && node openclaw.mjs message send --channel telegram --target ${target} --message ${JSON.stringify(message)}`,
      { timeout: 10000 }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
