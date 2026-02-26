import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function GET() {
  return new Promise<NextResponse>((resolve) => {
    const child = exec(
      'journalctl --user -u openclaw-gateway -n 50 --no-pager',
      { timeout: 5000 },
      (error, stdout, stderr) => {
        const logs = stdout.trim() || stderr.trim() || (error ? `Error: ${String(error)}` : '');
        resolve(NextResponse.json({ logs, timestamp: new Date().toISOString() }));
      }
    );
    child.on('error', (err) => {
      resolve(NextResponse.json({ logs: `Error: ${String(err)}`, timestamp: new Date().toISOString() }));
    });
  });
}
