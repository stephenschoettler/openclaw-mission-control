import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json() as { status: string; notes?: string };
  const { status, notes } = body;

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be pending, approved, or rejected' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM approvals WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  db.prepare(
    `UPDATE approvals SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(status, notes ?? null, id);

  const updated = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id);
  return NextResponse.json(updated);
}
