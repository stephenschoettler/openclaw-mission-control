import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST(req: NextRequest) {
  const body = await req.json() as { message: string };
  const { message } = body;

  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const text = `📡 Message from Mission Control: ${message.trim()}`;

  try {
    execSync(
      `cd /home/w0lf/dev/openclaw && node openclaw.mjs message --to telegram:8298379200 --text ${JSON.stringify(text)}`,
      { timeout: 15000 }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
