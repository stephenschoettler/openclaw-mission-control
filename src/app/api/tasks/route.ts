import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description = '', assignee = 'me', priority = 'medium', status = 'backlog' } = body;
  const stmt = db.prepare('INSERT INTO tasks (title, description, assignee, priority, status) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(title, description, assignee, priority, status);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, title_match, ...fields } = body;

  // Support lookup by title (for agents that don't store task IDs)
  let resolvedId = id;
  if (!resolvedId && title_match) {
    const found = db.prepare(
      `SELECT id FROM tasks WHERE title LIKE ? ORDER BY created_at DESC LIMIT 1`
    ).get(`%${title_match}%`) as { id: number } | undefined;
    if (found) resolvedId = found.id;
  }

  if (!resolvedId) return NextResponse.json({ error: 'id or title_match required' }, { status: 400 });

  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(fields);
  if (sets) {
    db.prepare(`UPDATE tasks SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...vals, resolvedId);
  }
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(resolvedId);
  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
