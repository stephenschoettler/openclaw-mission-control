import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/home/w0lf';
const OPENCLAW_JSON = path.join(HOME, '.openclaw', 'openclaw.json');
const AGENTS_DIR = path.join(HOME, '.openclaw', 'agents');

// Map agent IDs to their on-disk directory names (some differ)
const AGENT_DIR_MAP: Record<string, string> = {
  'code-monkey': 'dev',
  'main': 'main',
  'answring': 'answring',
  'tldr': 'tldr',
  'roadie': 'roadie',
  'hustle': 'hustle',
  'forge': 'forge',
  'docs': 'docs',
  'ralph': 'ralph',
  'browser': 'browser',
  'answring-ops': 'answring-ops',
  'answring-marketing': 'answring-marketing',
  'answring-dev': 'answring-dev',
  'answring-security': 'answring-security',
  'answring-strategist': 'answring-strategist',
  'answring-sales': 'answring-sales',
  'answring-qa': 'answring-qa',
};

// Short role labels
const ROLE_MAP: Record<string, string> = {
  'main': 'Chief of Staff',
  'answring': 'Answring Lead',
  'answring-ops': 'Ops',
  'answring-marketing': 'Marketing',
  'answring-dev': 'Dev',
  'answring-strategist': 'Strategist',
  'answring-sales': 'Sales',
  'answring-qa': 'QA',
  'answring-security': 'Security',
  'tldr': 'Digest',
  'roadie': 'Roadie',
  'hustle': 'Growth',
  'code-monkey': 'Eng Manager',
  'code-frontend': 'Frontend',
  'code-backend': 'Backend',
  'code-devops': 'DevOps',
  'code-webdev': 'WebDev',
  'ralph': 'QA Lead',
  'forge': 'Builder',
  'docs': 'Professor',
  'browser': 'Crawler',
};

// Read sessions.json to find the most recently active session
function getSessionStatus(agentId: string): { isWorking: boolean; lastActiveMs: number; sessionId?: string } {
  const dirName = AGENT_DIR_MAP[agentId] || agentId;
  const sessionsJsonPath = path.join(AGENTS_DIR, dirName, 'sessions', 'sessions.json');
  const WORKING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  try {
    const raw = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf-8'));
    let latestMs = 0;
    let latestSessionId = '';

    for (const [key, val] of Object.entries(raw as Record<string, any>)) {
      if (key.includes(':watercooler')) continue; // skip watercooler
      const updatedAt = val?.updatedAt || 0;
      if (updatedAt > latestMs) {
        latestMs = updatedAt;
        latestSessionId = val?.sessionId || '';
      }
    }

    if (latestMs > 0 && (now - latestMs) < WORKING_THRESHOLD_MS) {
      return { isWorking: true, lastActiveMs: latestMs, sessionId: latestSessionId };
    }
    return { isWorking: false, lastActiveMs: latestMs, sessionId: latestSessionId };
  } catch {
    return { isWorking: false, lastActiveMs: 0 };
  }
}

// Read last few lines of a session JSONL to get last task
function getLastTask(agentId: string, sessionId: string): string {
  const dirName = AGENT_DIR_MAP[agentId] || agentId;
  const filePath = path.join(AGENTS_DIR, dirName, 'sessions', `${sessionId}.jsonl`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim()).slice(-30);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const msg = entry.type === 'message' ? entry.message : entry;
        if (msg?.role === 'assistant' && Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text?.length > 10) {
              const t = part.text.split('\n').find((l: string) =>
                l.trim().length > 10 && !l.startsWith('#') && !l.startsWith('---')
              );
              if (t) return t.slice(0, 120);
            }
          }
        }
      } catch {}
    }
  } catch {}
  return '';
}

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const agentList: any[] = (config.agents?.list || []).filter((a: any) => a.id && a.id !== 'defaults');

    const agents = agentList.map((a: any) => {
      const id = a.id;
      const sessionStatus = getSessionStatus(id);
      const lastTask = sessionStatus.isWorking && sessionStatus.sessionId
        ? getLastTask(id, sessionStatus.sessionId)
        : '';

      return {
        id,
        name: a.name || id,
        role: ROLE_MAP[id] || 'Agent',
        status: sessionStatus.isWorking ? 'working' : 'idle',
        lastActiveMs: sessionStatus.lastActiveMs,
        lastTask: lastTask || null,
        workspace: a.workspace || '',
        model: a.model?.primary || config.agents?.defaults?.model?.primary || '',
        sessionId: sessionStatus.sessionId || null,
      };
    });

    return NextResponse.json(agents);
  } catch (err) {
    console.error('agent-status error:', err);
    return NextResponse.json([]);
  }
}
