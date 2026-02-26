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

  // Capture old status before update for activity logging
  const oldTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(resolvedId) as { title: string; assignee: string; status: string } | undefined;
  const oldStatus = oldTask?.status;

  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(fields);
  if (sets) {
    db.prepare(`UPDATE tasks SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...vals, resolvedId);
  }
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(resolvedId) as { title: string; assignee: string; status: string } | undefined;

  // Auto-log activity on task status transitions
  if (fields.status && task && oldStatus && fields.status !== oldStatus) {
    const assignee = task.assignee || 'unknown';
    const agentName = assignee.charAt(0).toUpperCase() + assignee.slice(1).replace(/-/g, ' ');
    type ActivityEntry = { event_type: string; title: string } | null;
    let entry: ActivityEntry = null;
    if (oldStatus === 'backlog' && fields.status === 'in-progress') {
      entry = { event_type: 'task_start', title: `Started: ${task.title}` };
    } else if (oldStatus === 'in-progress' && fields.status === 'review') {
      entry = { event_type: 'task_end', title: `Submitted for review: ${task.title}` };
    } else if (oldStatus === 'review' && fields.status === 'done') {
      entry = { event_type: 'task_end', title: `Completed: ${task.title}` };
    } else if (oldStatus === 'review' && fields.status === 'backlog') {
      entry = { event_type: 'task_end', title: `QA REJECTED: ${task.title}` };
    }
    if (entry) {
      try {
        db.prepare(
          'INSERT INTO activity_feed (agent_id, agent_name, event_type, title) VALUES (?, ?, ?, ?)'
        ).run(assignee, agentName, entry.event_type, entry.title);
      } catch { /* non-blocking */ }
    }
  }

  // Fire-and-forget: auto-spawn Ralph when task moves to review
  if (fields.status === 'review' && task) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { spawn, execSync } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const home = process.env.HOME || require('os').homedir();
      const openclawMjs = `${home}/dev/openclaw/openclaw.mjs`;
      let sha = 'unknown';
      try { sha = execSync(`git -C ${home}/mission-control rev-parse --short HEAD`, { encoding: 'utf8' }).trim(); } catch { /* ignore */ }
      const message = `QA review of commit ${sha} in ~/mission-control. Task: "${task.title}". Check what changed in the most recent commit. title_match: "${task.title}". Return APPROVED ✅ or REJECTED ❌.`;
      const out = fs.openSync('/tmp/ralph-spawn.log', 'a');
      const proc = spawn('node', [openclawMjs, 'agent', '--agent', 'ralph', '--message', message], {
        detached: true,
        stdio: ['ignore', out, out],
        cwd: home,
        env: { ...process.env, HOME: home }
      });
      proc.on('spawn', () => { try { fs.closeSync(out); } catch { /* ignore */ } });
      proc.on('error', () => { try { fs.closeSync(out); } catch { /* ignore */ } });
      proc.unref();
    } catch (e) {
      console.error('Ralph spawn failed:', e);
      // non-blocking — never fail the PATCH
    }
  }

  // Fire-and-forget: append to today's memory file
  if (fields.status === 'done' && task) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
      const memDir = `${process.env.HOME || require('os').homedir()}/.openclaw/workspace/memory`;
      const memPath = `${memDir}/${date}.md`;
      const line = `\n- ✅ Task completed: "${task.title}" (assigned: ${task.assignee}, ${date})\n`;
      fs.mkdirSync(memDir, { recursive: true });
      fs.appendFileSync(memPath, line, 'utf8');
    } catch { /* never block the response */ }
  }

  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
