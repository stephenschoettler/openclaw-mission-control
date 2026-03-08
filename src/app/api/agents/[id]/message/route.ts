import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME || os.homedir(), 'dev', 'openclaw');
const OPENCLAW_CLI = path.join(OPENCLAW_DIR, 'node_modules', '.bin', 'openclaw');

function runCommand(cmd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise(resolve => {
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() || '',
        stderr: stderr?.toString() || '',
        code: error?.code ?? 0,
      });
    });
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || /[^a-zA-Z0-9_\-]/.test(id)) {
    return NextResponse.json({ success: false, message: 'Invalid agent id' }, { status: 400 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  }

  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ success: false, message: 'Missing message field' }, { status: 400 });
  }

  // Escape the message for shell
  const escapedMessage = message.replace(/'/g, "'\\''");

  const cliPath = fs.existsSync(OPENCLAW_CLI) ? OPENCLAW_CLI : 'npx openclaw';

  // openclaw agent --agent {id} --message "..." sends a message to the agent's active session
  const result = await runCommand(`${cliPath} agent --agent ${id} --message '${escapedMessage}' 2>&1`);

  if (result.code === 0) {
    return NextResponse.json({
      success: true,
      message: `Message sent to agent: ${id}`,
      output: result.stdout.slice(0, 500),
    });
  }

  return NextResponse.json({
    success: false,
    message: `Failed to send message to agent: ${id}`,
    stderr: result.stderr.slice(0, 500),
  }, { status: 500 });
}
