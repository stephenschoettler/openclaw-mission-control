import { NextRequest, NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
import { OPENCLAW_DIR, TELEGRAM_TARGET_ID } from '@/config';

export async function POST(req: NextRequest) {
  const body = await req.json() as { message: string };
  const { message } = body;

  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const target = TELEGRAM_TARGET_ID || 'telegram';
  const text = `📡 Message from Mission Control: ${message.trim()}`;

  const result = spawnSync(
    'node',
    ['openclaw.mjs', 'message', '--to', `telegram:${target}`, '--text', text],
    { cwd: OPENCLAW_DIR, timeout: 15000 }
  );

  if (result.status !== 0) {
    const errMsg = result.stderr?.toString() || 'Failed to send message';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
