import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const items = db.prepare('SELECT * FROM content_items ORDER BY created_at DESC').all();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, notes = '', script = '', thumbnail_url = '', stage = 'idea' } = body;
  const stmt = db.prepare('INSERT INTO content_items (title, notes, script, thumbnail_url, stage) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(title, notes, script, thumbnail_url, stage);
  const item = db.prepare('SELECT * FROM content_items WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(fields);
  if (sets) {
    db.prepare(`UPDATE content_items SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...vals, id);
  }
  const item = db.prepare('SELECT * FROM content_items WHERE id = ?').get(id);
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  db.prepare('DELETE FROM content_items WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
