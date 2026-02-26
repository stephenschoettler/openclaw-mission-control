import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET() {
  try {
    const ocPath = path.join(process.env.HOME || '/home/w0lf', 'dev/openclaw/openclaw.mjs');
    const output = execSync(`node ${ocPath} doctor`, { timeout: 5000, encoding: 'utf8' });
    return NextResponse.json({ output: output.trim(), timestamp: new Date().toISOString() });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    const output = (err.stdout || '') + (err.stderr || '') || String(e);
    return NextResponse.json({ output: output.trim(), timestamp: new Date().toISOString() });
  }
}
