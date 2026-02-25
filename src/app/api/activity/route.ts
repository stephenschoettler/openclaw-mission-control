import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agent_id');

  const rows = agentId
    ? db.prepare('SELECT * FROM activity_feed WHERE agent_id = ? ORDER BY id DESC LIMIT 50').all(agentId)
    : db.prepare('SELECT * FROM activity_feed ORDER BY id DESC LIMIT 50').all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    agent_id: string;
    agent_name: string;
    event_type: string;
    title: string;
    detail?: string;
  };

  const { agent_id, agent_name, event_type, title, detail } = body;

  if (!agent_id || !agent_name || !event_type || !title) {
    return NextResponse.json({ error: 'Missing required fields: agent_id, agent_name, event_type, title' }, { status: 400 });
  }

  try {
    const result = db.prepare(
      'INSERT INTO activity_feed (agent_id, agent_name, event_type, title, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(agent_id, agent_name, event_type, title, detail ?? null);

    const row = db.prepare('SELECT * FROM activity_feed WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    if (message.includes('CHECK constraint')) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create activity entry' }, { status: 500 });
  }
}
