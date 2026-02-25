import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const query = status
    ? db.prepare('SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC')
    : db.prepare('SELECT * FROM approvals ORDER BY created_at DESC');

  const rows = status ? query.all(status) : query.all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    title: string;
    type: string;
    agent: string;
    content: string;
    notes?: string;
  };

  const { title, type, agent, content, notes } = body;

  if (!title || !type || !agent || !content) {
    return NextResponse.json({ error: 'Missing required fields: title, type, agent, content' }, { status: 400 });
  }

  try {
    const stmt = db.prepare(
      'INSERT INTO approvals (title, type, agent, content, notes) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(title, type, agent, content, notes ?? null);
    const row = db.prepare('SELECT * FROM approvals WHERE id = ?').get(result.lastInsertRowid);

    // Auto-create activity feed entry
    try {
      db.prepare(
        'INSERT INTO activity_feed (agent_id, agent_name, event_type, title, detail) VALUES (?, ?, ?, ?, ?)'
      ).run(
        agent.toLowerCase().replace(/\s+/g, '-'),
        agent,
        'approval',
        `Submitted for approval: ${title}`,
        content.slice(0, 100)
      );
    } catch {
      // Don't fail the approval if activity feed insert fails
    }

    // Fire-and-forget Telegram notification — never blocks or fails the response
    fetch('http://localhost:3001/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `📋 New approval request: "${title}" from ${agent}\n\nCheck Mission Control: http://localhost:3001/approvals`
      })
    }).catch(() => {});

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    if (message.includes('CHECK constraint')) {
      return NextResponse.json({ error: 'Invalid type. Must be one of: outreach, proposal, code, strategy, other' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create approval' }, { status: 500 });
  }
}
