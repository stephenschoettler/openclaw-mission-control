import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const events = db.prepare('SELECT * FROM events ORDER BY date ASC, time ASC').all();
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, date, time = '', notes = '' } = body;
  const stmt = db.prepare('INSERT INTO events (title, date, time, notes) VALUES (?, ?, ?, ?)');
  const result = stmt.run(title, date, time, notes);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(event, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
