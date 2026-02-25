import { NextRequest, NextResponse } from 'next/server';
import { spawnSync } from 'child_process';

export async function POST(req: NextRequest) {
  const body = await req.json() as { message: string };
  const { message } = body;

  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const text = `📡 Message from Mission Control: ${message.trim()}`;

  const result = spawnSync(
    'node',
    ['openclaw.mjs', 'message', '--to', 'telegram:8298379200', '--text', text],
    { cwd: '/home/w0lf/dev/openclaw', timeout: 15000 }
  );

  if (result.status !== 0) {
    const errMsg = result.stderr?.toString() || 'Failed to send message';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
