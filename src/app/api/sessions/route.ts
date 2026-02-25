import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OPENCLAW_HOME = process.env.HOME ? path.join(process.env.HOME, '.openclaw') : '/home/w0lf/.openclaw';
const AGENTS_DIR = path.join(OPENCLAW_HOME, 'agents');
const CONFIG_PATH = path.join(OPENCLAW_HOME, 'openclaw.json');

interface SessionEntry {
  session_key: string;
  agent_id: string;
  agent_name: string;
  model: string;
  context_tokens: number;
  context_pct: number;
  total_tokens: number;
  status: 'active' | 'idle';
  last_active: string;
  session_type: string;
}

interface RawSession {
  sessionId?: string;
  updatedAt?: number;
  model?: string;
  contextTokens?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheRead?: number;
  totalTokensFresh?: boolean;
}

function getAgentNames(): Record<string, string> {
  const names: Record<string, string> = {};
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const agentList: { id?: string; name?: string }[] = config?.agents?.list || [];
    for (const ag of agentList) {
      if (ag.id && ag.name) names[ag.id] = ag.name;
    }
  } catch {
    // ignore
  }
  return names;
}

function modelDisplayName(model: string): string {
  if (!model) return 'unknown';
  const m = model.toLowerCase();
  const part = m.includes('/') ? m.split('/').pop()! : m;
  if (part.includes('opus')) return 'Claude Opus';
  if (part.includes('sonnet')) return 'Claude Sonnet';
  if (part.includes('haiku')) return 'Claude Haiku';
  if (part.includes('grok-4-fast') || part.includes('grok-4.1-fast')) return 'Grok 4 Fast';
  if (part.includes('grok')) return 'Grok 4';
  if (part.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';
  if (part.includes('gemini')) return 'Gemini Flash';
  if (part.includes('gpt-4o')) return 'GPT-4o';
  if (part.includes('gpt')) return 'GPT';
  if (part.includes('llama')) return 'Llama';
  return part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function GET() {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000; // 24h
  const agentNames = getAgentNames();
  const sessions: SessionEntry[] = [];

  let agentDirs: string[] = [];
  try {
    agentDirs = fs.readdirSync(AGENTS_DIR).filter(d =>
      fs.statSync(path.join(AGENTS_DIR, d)).isDirectory()
    );
  } catch {
    return NextResponse.json([]);
  }

  // Also get gateway PID for "active" detection
  let gatewayCmdLine = '';
  try {
    gatewayCmdLine = execSync('pgrep -f openclaw-gateway 2>/dev/null || true', { encoding: 'utf-8' }).trim();
  } catch {
    // ignore
  }
  const gatewayPid = gatewayCmdLine.split('\n')[0]?.trim() || '';

  for (const agentId of agentDirs) {
    const sessionsJsonPath = path.join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
    if (!fs.existsSync(sessionsJsonPath)) continue;

    let store: Record<string, RawSession>;
    try {
      store = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf-8'));
    } catch {
      continue;
    }

    for (const [key, val] of Object.entries(store)) {
      if (!val?.sessionId) continue;
      // Skip internal run sessions
      if (key.includes(':run:')) continue;

      const updatedAt = val.updatedAt || 0;
      if (updatedAt < cutoff) continue;

      const contextTokens = val.contextTokens || 0;
      const totalTokens = val.totalTokens || 0;
      const contextPct = contextTokens > 0 ? Math.min(Math.round((totalTokens / contextTokens) * 100), 100) : 0;

      const ageMs = now - updatedAt;
      const isActive = ageMs < 5 * 60 * 1000 && gatewayPid ? true : ageMs < 2 * 60 * 1000;

      const agentName = agentNames[agentId] || agentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const model = val.model || '';

      let sessionType = 'other';
      if (key.includes(':cron:')) sessionType = 'cron';
      else if (key.includes(':subagent:')) sessionType = 'subagent';
      else if (key.includes(':group:')) sessionType = 'group';
      else if (key.includes(':telegram')) sessionType = 'telegram';
      else if (key.endsWith(':main')) sessionType = 'main';

      sessions.push({
        session_key: key,
        agent_id: agentId,
        agent_name: agentName,
        model: modelDisplayName(model),
        context_tokens: contextTokens,
        context_pct: contextPct,
        total_tokens: totalTokens,
        status: isActive ? 'active' : 'idle',
        last_active: updatedAt > 0 ? new Date(updatedAt).toISOString() : '',
        session_type: sessionType,
      });
    }
  }

  // Sort: active first, then by last_active desc
  sessions.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
  });

  return NextResponse.json(sessions.slice(0, 50));
}
