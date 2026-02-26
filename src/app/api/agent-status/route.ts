import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

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
