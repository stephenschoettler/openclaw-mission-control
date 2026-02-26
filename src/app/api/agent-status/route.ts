import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface SessionData {
  agent_id: string;
  agent_name: string;
  status: string;
}

export async function GET() {
  // Get all office_status rows
  const rows = db.prepare('SELECT * FROM office_status ORDER BY updated_at DESC').all() as {
    agent_id: string;
    agent_name: string;
    role: string;
    current_task: string;
    status: string;
    updated_at: string;
  }[];

  // Merge with live session data — active sessions override status
  try {
    const res = await fetch('http://localhost:3001/api/sessions', { cache: 'no-store' });
    if (res.ok) {
      const sessions: SessionData[] = await res.json();
      // Find agents with at least one active session
      const activeAgentIds = new Set(
        sessions
          .filter(s => s.status === 'active')
          .map(s => s.agent_id === 'main' ? 'babbage' : s.agent_id)
      );
      return NextResponse.json(
        rows.map(row => ({
          ...row,
          status: activeAgentIds.has(row.agent_id) ? 'working' : row.status,
        }))
      );
    }
  } catch {
    // Fall through to raw DB data
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    agent_id: string;
    agent_name: string;
    status: string;
    current_task?: string;
  };

  // Normalize "main" → "babbage" so duplicate rows never appear
  const normalizedId = body.agent_id === 'main' ? 'babbage' : body.agent_id;
  const normalizedName = (normalizedId === 'babbage') ? 'Babbage' : body.agent_name;
  const agent_id = normalizedId;
  const agent_name = normalizedName;
  const { status, current_task = '' } = body;

  if (!agent_id || !agent_name || !status) {
    return NextResponse.json({ error: 'Missing required fields: agent_id, agent_name, status' }, { status: 400 });
  }

  db.prepare(`
    INSERT INTO office_status (agent_id, agent_name, role, current_task, status)
    VALUES (?, ?, '', ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      agent_name = excluded.agent_name,
      current_task = excluded.current_task,
      status = excluded.status,
      updated_at = datetime('now')
  `).run(agent_id, agent_name, current_task, status);

  return NextResponse.json({ ok: true });
}
