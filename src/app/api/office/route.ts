import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const stations = db.prepare('SELECT * FROM office_status ORDER BY agent_name ASC').all();
  return NextResponse.json(stations);
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
