import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
  // Ensure the completed_tasks table exists (same schema as tasks + archived_at)
  db.exec(`
    CREATE TABLE IF NOT EXISTS completed_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assignee TEXT DEFAULT 'me',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'done',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      archived_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Get all done tasks
  const doneTasks = db.prepare(`SELECT * FROM tasks WHERE status = 'done'`).all() as Array<{
    id: number;
    title: string;
    description: string;
    assignee: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;

  if (doneTasks.length === 0) {
    return NextResponse.json({ archived: 0, message: 'No done tasks to archive.' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO completed_tasks (title, description, assignee, priority, status, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const archiveMany = db.transaction(() => {
    for (const task of doneTasks) {
      insertStmt.run(
        task.title,
        task.description,
        task.assignee,
        task.priority,
        task.status,
        task.created_at,
        task.updated_at,
      );
    }
    db.prepare(`DELETE FROM tasks WHERE status = 'done'`).run();
  });

  archiveMany();

  return NextResponse.json({
    archived: doneTasks.length,
    message: `Archived ${doneTasks.length} completed task(s) and cleared them from the board.`,
  });
}
