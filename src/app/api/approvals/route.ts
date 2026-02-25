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

  const stmt = db.prepare(
    'INSERT INTO approvals (title, type, agent, content, notes) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(title, type, agent, content, notes ?? null);
  const row = db.prepare('SELECT * FROM approvals WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}
