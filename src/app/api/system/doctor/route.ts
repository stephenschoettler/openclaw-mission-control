import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';

export async function GET() {
  const ocPath = path.join(os.homedir(), 'dev/openclaw/openclaw.mjs');
  return new Promise<NextResponse>((resolve) => {
    const child = exec(`node ${ocPath} doctor`, { timeout: 5000 }, (error, stdout, stderr) => {
      const output = (stdout + stderr).trim() || (error ? String(error) : 'No output');
      resolve(NextResponse.json({ output, timestamp: new Date().toISOString() }));
    });
    child.on('error', (err) => {
      resolve(NextResponse.json({ output: String(err), timestamp: new Date().toISOString() }));
    });
  });
}
