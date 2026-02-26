import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * GET /api/automation/ralph-complete
 *
 * Automation endpoint polled every ~15s from the client.
 * - If Ralph posted task_end in the last 30s → move all 'review' tasks to 'done', clear ralph + code-monkey to idle
 * - If code-monkey posted task_end in the last 30s → clear code-monkey to idle
 */
export async function GET() {
  const results: string[] = [];

  // ── 1. Ralph completed a review ─────────────────────────────────────────────
  const ralphEnd = db.prepare(`
    SELECT id FROM activity_feed
    WHERE agent_id = 'ralph'
      AND event_type = 'task_end'
      AND created_at > datetime('now', '-30 seconds')
    ORDER BY id DESC
    LIMIT 1
  `).get() as { id: number } | undefined;

  if (ralphEnd) {
    // Move all tasks in 'review' → 'done'
    const updated = db.prepare(`
      UPDATE tasks
      SET status = 'done', updated_at = datetime('now')
      WHERE status = 'review'
    `).run();

    if (updated.changes > 0) {
      results.push(`Moved ${updated.changes} review task(s) to done`);

      // Append completed tasks to memory
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs');
        const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
        const memDir = '/home/w0lf/.openclaw/workspace/memory';
        const memPath = `${memDir}/${date}.md`;
        fs.mkdirSync(memDir, { recursive: true });
        fs.appendFileSync(memPath, `\n- ✅ Ralph approved: ${updated.changes} task(s) moved to done (${date})\n`, 'utf8');
      } catch { /* never block */ }
    }

    // Clear ralph to idle
    db.prepare(`
      INSERT INTO office_status (agent_id, agent_name, role, current_task, status)
      VALUES ('ralph', 'Ralph', 'qa', '', 'idle')
      ON CONFLICT(agent_id) DO UPDATE SET
        current_task = '',
        status = 'idle',
        updated_at = datetime('now')
    `).run();

    // Clear code-monkey to idle
    db.prepare(`
      INSERT INTO office_status (agent_id, agent_name, role, current_task, status)
      VALUES ('code-monkey', 'Code Monkey', 'engineering', '', 'idle')
      ON CONFLICT(agent_id) DO UPDATE SET
        current_task = '',
        status = 'idle',
        updated_at = datetime('now')
    `).run();

    results.push('Cleared ralph + code-monkey to idle');
  }

  // ── 2. Code-monkey finished a task (without ralph) ──────────────────────────
  if (!ralphEnd) {
    const monkeyEnd = db.prepare(`
      SELECT id FROM activity_feed
      WHERE agent_id = 'code-monkey'
        AND event_type = 'task_end'
        AND created_at > datetime('now', '-30 seconds')
      ORDER BY id DESC
      LIMIT 1
    `).get() as { id: number } | undefined;

    if (monkeyEnd) {
      db.prepare(`
        INSERT INTO office_status (agent_id, agent_name, role, current_task, status)
        VALUES ('code-monkey', 'Code Monkey', 'engineering', '', 'idle')
        ON CONFLICT(agent_id) DO UPDATE SET
          current_task = '',
          status = 'idle',
          updated_at = datetime('now')
      `).run();
      results.push('Cleared code-monkey to idle');
    }
  }

  return NextResponse.json({ ok: true, actions: results });
}
