import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const logs = execSync('journalctl --user -u openclaw-gateway -n 50 --no-pager', {
      timeout: 5000,
      encoding: 'utf8',
    });
    return NextResponse.json({ logs: logs.trim(), timestamp: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ logs: `Error fetching logs: ${String(e)}`, timestamp: new Date().toISOString() });
  }
}
