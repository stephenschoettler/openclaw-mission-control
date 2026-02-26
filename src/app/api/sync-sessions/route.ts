import { NextResponse } from 'next/server';
import { MAIN_AGENT_ALIAS, MAIN_AGENT_NAME } from '@/config';
import db from '@/lib/db';

interface SessionData {
  agent_id: string;
  agent_name: string;
  status: string;
}

export async function POST() {
  try {
    const res = await fetch('http://localhost:3001/api/sessions', { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 502 });
    }

    const sessions: SessionData[] = await res.json();

    const agentMap = new Map<string, { agent_name: string; hasActive: boolean }>();

    for (const s of sessions) {
      const agent_id = s.agent_id === 'main' ? MAIN_AGENT_ALIAS : s.agent_id;
      const agent_name = agent_id === MAIN_AGENT_ALIAS ? MAIN_AGENT_NAME : s.agent_name;
      const existing = agentMap.get(agent_id);
      const hasActive = s.status === 'active';
      if (!existing) {
        agentMap.set(agent_id, { agent_name, hasActive });
      } else if (hasActive) {
        agentMap.set(agent_id, { agent_name, hasActive: true });
      }
    }

    const upsert = db.prepare(`
      INSERT INTO office_status (agent_id, agent_name, role, current_task, status)
      VALUES (?, ?, '', '', ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        agent_name = excluded.agent_name,
        status = excluded.status,
        updated_at = datetime('now')
    `);

    for (const agent_id of Array.from(agentMap.keys())) {
      const { agent_name, hasActive } = agentMap.get(agent_id)!;
      upsert.run(agent_id, agent_name, hasActive ? 'working' : 'idle');
    }

    // Force-idle any agent marked 'working' that has no active session
    const activeIds = Array.from(agentMap.keys());
    if (activeIds.length > 0) {
      const placeholders = activeIds.map(() => '?').join(',');
      (db.prepare(`UPDATE office_status SET status = 'idle', updated_at = datetime('now') WHERE status = 'working' AND agent_id NOT IN (${placeholders})`) as any).run(...activeIds);
    } else {
      db.prepare(`UPDATE office_status SET status = 'idle', updated_at = datetime('now') WHERE status = 'working'`).run();
    }

    return NextResponse.json({ ok: true, synced: agentMap.size });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
