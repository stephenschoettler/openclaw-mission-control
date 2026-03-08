import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME || os.homedir(), 'dev', 'openclaw');
const OPENCLAW_CLI = path.join(OPENCLAW_DIR, 'node_modules', '.bin', 'openclaw');
const AGENTS_DIR = path.join(process.env.HOME || os.homedir(), '.openclaw', 'agents');

function runCommand(cmd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise(resolve => {
    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() || '',
        stderr: stderr?.toString() || '',
        code: error?.code ?? 0,
      });
    });
  });
}

function getActiveSessionId(agentId: string): string | null {
  try {
    const sessionsJson = path.join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
    if (!fs.existsSync(sessionsJson)) return null;
    const raw = JSON.parse(fs.readFileSync(sessionsJson, 'utf-8'));
    let latestMs = 0;
    let latestSessionId: string | null = null;
    for (const [, val] of Object.entries(raw as Record<string, Record<string, unknown>>)) {
      const updatedAt = (val?.updatedAt as number) || 0;
      if (updatedAt > latestMs) {
        latestMs = updatedAt;
        latestSessionId = (val?.sessionId as string) || null;
      }
    }
    return latestSessionId;
  } catch {
    return null;
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || /[^a-zA-Z0-9_\-]/.test(id)) {
    return NextResponse.json({ success: false, message: 'Invalid agent id' }, { status: 400 });
  }

  const sessionId = getActiveSessionId(id);

  // Try openclaw CLI first (steer with stop signal)
  // The CLI doesn't have a dedicated kill command, so we try to find and kill the process
  // by looking for the session lock file and resolving the PID
  const lockFile = sessionId
    ? path.join(AGENTS_DIR, id, 'sessions', `${sessionId}.jsonl.lock`)
    : null;

  if (lockFile && fs.existsSync(lockFile)) {
    try {
      const lockContent = fs.readFileSync(lockFile, 'utf-8').trim();
      const pid = parseInt(lockContent, 10);
      if (!isNaN(pid) && pid > 0) {
        const result = await runCommand(`kill -SIGTERM ${pid} 2>/dev/null || kill -9 ${pid} 2>/dev/null`);
        if (result.code === 0 || result.stderr === '') {
          return NextResponse.json({ success: true, message: `Sent SIGTERM to session process (pid ${pid})` });
        }
      }
    } catch {
      // lock file may not contain a PID — fall through
    }
  }

  // Fallback: try openclaw CLI with --agent flag
  const cliPath = fs.existsSync(OPENCLAW_CLI) ? OPENCLAW_CLI : 'npx openclaw';
  const result = await runCommand(`${cliPath} sessions cleanup --agent ${id} 2>&1`);

  if (result.code === 0) {
    return NextResponse.json({ success: true, message: `Session cleanup triggered for agent: ${id}` });
  }

  return NextResponse.json({
    success: false,
    message: `Could not stop agent session. No active lock found and CLI fallback failed. stderr: ${result.stderr}`,
  }, { status: 500 });
}
