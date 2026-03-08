import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/home/w0lf';
const OPENCLAW_JSON = path.join(HOME, '.openclaw', 'openclaw.json');
const GATEWAY_URL = 'http://127.0.0.1:18789/tools/invoke';

// Display names for agents
const DISPLAY_NAMES: Record<string, string> = {
  main: 'Babbage', answring: 'Maya', 'answring-sales': 'Sal',
  'answring-qa': 'Quinn', 'answring-strategist': 'Stella', 'answring-ops': 'Opie',
  'answring-dev': 'Devin', 'answring-marketing': 'Marcus', 'answring-security': 'Cera',
  'code-monkey': 'Code Monkey', 'code-frontend': 'Frontend', 'code-backend': 'Backend',
  'code-devops': 'DevOps', 'code-webdev': 'WebDev', ralph: 'Ralph', tldr: 'Cliff',
  browser: 'Crawler', forge: 'Forge', hustle: 'Hustle', roadie: 'Roadie', docs: 'The Professor',
  pixel: 'Pixel',
};

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const token = config?.gateway?.auth?.token || '';

    const resp = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tool: 'sessions_list', args: { activeMinutes: 30, limit: 30 } }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json();
    const rawText = data?.result?.content?.[0]?.text || "{}";
    const parsed = JSON.parse(rawText);
    const sessions: any[] = parsed?.sessions || [];

    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;

    const liveEntries = sessions
      .filter((s: any) => {
        const key: string = s.key || '';
        if (key.includes(':cron:') || key.includes(':watercooler')) return false;
        return (now - s.updatedAt) < FIVE_MIN;
      })
      .map((s: any) => {
        const parts = (s.key || '').split(':');
        const agentId = parts.length >= 2 ? parts[1] : 'unknown';
        const contextPct = (s.contextTokens && s.totalTokens)
          ? Math.round((s.totalTokens / s.contextTokens) * 100)
          : null;
        return {
          id: `live-${s.sessionId}`,
          agent_id: agentId,
          agent_name: DISPLAY_NAMES[agentId] || agentId,
          event_type: 'session_active',
          title: `Active session — ${s.model || 'unknown model'}`,
          detail: contextPct !== null ? `Context: ${contextPct}% (${s.totalTokens?.toLocaleString()}/${s.contextTokens?.toLocaleString()} tokens)` : null,
          created_at: new Date(s.updatedAt).toISOString(),
          source: 'live',
          model: s.model || null,
          totalTokens: s.totalTokens || 0,
          contextTokens: s.contextTokens || 0,
          contextPct,
          sessionId: s.sessionId,
          ageMs: now - s.updatedAt,
        };
      });

    return NextResponse.json(liveEntries);
  } catch (err) {
    console.error('Activity live error:', err);
    return NextResponse.json([]);
  }
}
