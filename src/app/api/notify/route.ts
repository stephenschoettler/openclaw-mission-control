import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST(req: NextRequest) {
  const body = await req.json() as { message?: string };
  const { message } = body;
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });
  try {
    execSync(
      `cd /home/w0lf/dev/openclaw && node openclaw.mjs message send --channel telegram --target 8298379200 --message ${JSON.stringify(message)}`,
      { timeout: 10000 }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
