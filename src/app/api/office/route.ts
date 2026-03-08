import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/home/w0lf';
const OPENCLAW_JSON = path.join(HOME, '.openclaw', 'openclaw.json');
const GATEWAY_URL = 'http://127.0.0.1:18789/tools/invoke';

// Short role labels (1-2 words max)
const ROLE_MAP: Record<string, string> = {
  'main': 'Assistant',
  'answring': 'Manager',
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
  'browser': 'Browser',
  'pixel': 'Image Generation',
  'code-security': 'Security',
  'code-docs': 'Documentation',
};

// Team groupings
const TEAM_MAP: Record<string, string> = {
  'answring': 'answring',
  'answring-ops': 'answring',
  'answring-marketing': 'answring',
  'answring-dev': 'answring',
  'answring-strategist': 'answring',
  'answring-sales': 'answring',
  'answring-qa': 'answring',
  'answring-security': 'answring',
  'code-monkey': 'engineering',
  'code-frontend': 'engineering',
  'code-backend': 'engineering',
  'code-devops': 'engineering',
  'code-webdev': 'engineering',
  'ralph': 'engineering',
  'main': 'specialists',
  'tldr': 'specialists',
  'roadie': 'specialists',
  'hustle': 'specialists',
  'forge': 'specialists',
  'docs': 'specialists',
  'browser': 'specialists',
  'pixel': 'specialists',
  'code-security': 'dev',
  'code-docs': 'dev',
};

interface GatewaySession {
  key: string;
  updatedAt: number;
  sessionId: string;
  model?: string;
  totalTokens?: number;
  contextTokens?: number;
  label?: string;
}

function getGatewayToken(): string {
  const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
  return config?.gateway?.auth?.token || '';
}

async function fetchGatewaySessions(): Promise<GatewaySession[]> {
  try {
    const token = getGatewayToken();
    const resp = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tool: 'sessions_list', args: { activeMinutes: 60, limit: 50 } }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json();
    return data?.result?.details?.sessions || [];
  } catch {
    return [];
  }
}

function extractAgentId(key: string): string | null {
  // key format: "agent:<agentId>:<rest>"
  const parts = key.split(':');
  if (parts.length >= 2 && parts[0] === 'agent') return parts[1];
  return null;
}

function isNoisySession(key: string): boolean {
  return key.includes(':cron:') || key.includes(':watercooler');
}

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const agentList: any[] = config?.agents?.list || [];
    const gatewaySessions = await fetchGatewaySessions();

    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;

    // Build a map: agentId -> best (most recent non-cron/watercooler) session
    const activeMap = new Map<string, GatewaySession>();
    for (const sess of gatewaySessions) {
      if (isNoisySession(sess.key)) continue;
      const agentId = extractAgentId(sess.key);
      if (!agentId) continue;
      if ((now - sess.updatedAt) > FIVE_MIN) continue;

      const existing = activeMap.get(agentId);
      if (!existing || sess.updatedAt > existing.updatedAt) {
        activeMap.set(agentId, sess);
      }
    }

    const agents = agentList
      .filter((a: any) => a.id && a.id !== 'defaults')
      .map((a: any) => {
        const id = a.id;
        const liveSess = activeMap.get(id);
        const isActive = !!liveSess;
        return {
          id,
          name: a.name || id,
          status: isActive ? 'working' : 'idle',
          role: ROLE_MAP[id] || (a.name || id).split(' ').slice(-1)[0],
          lastTask: null,
          lastActiveMs: liveSess ? (now - liveSess.updatedAt) : 0,
          sessionId: liveSess?.sessionId || null,
          workspace: a.workspace || '',
          model: liveSess?.model || a.model || '',
          totalTokens: liveSess?.totalTokens || 0,
          contextTokens: liveSess?.contextTokens || 0,
          task: null,
          color: null,
          mood: 'good',
          skills: [],
          xp: 0,
          level: 1,
          team: TEAM_MAP[id] || 'specialists',
        };
      });

    return NextResponse.json({
      agents,
      activityLog: [],
      chatLog: [],
      setupCheck: null,
    });
  } catch (err) {
    console.error('Office API error:', err);
    return NextResponse.json({ agents: [], activityLog: [], chatLog: [], setupCheck: null });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agent_id, agent_name, role = '', current_task = '', status = 'idle' } = body;
  const stmt = db.prepare(`
    INSERT INTO office_status (agent_id, agent_name, role, current_task, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      agent_name = excluded.agent_name,
      role = excluded.role,
      current_task = excluded.current_task,
      status = excluded.status,
      updated_at = datetime('now')
  `);
  stmt.run(agent_id, agent_name, role, current_task, status);
  const station = db.prepare('SELECT * FROM office_status WHERE agent_id = ?').get(agent_id);
  return NextResponse.json(station);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { agent_id, ...fields } = body;
  if (!agent_id) return NextResponse.json({ error: 'agent_id required' }, { status: 400 });

  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(fields);
  if (sets) {
    db.prepare(`UPDATE office_status SET ${sets}, updated_at = datetime('now') WHERE agent_id = ?`).run(...vals, agent_id);
  }
  const station = db.prepare('SELECT * FROM office_status WHERE agent_id = ?').get(agent_id);
  return NextResponse.json(station);
}
