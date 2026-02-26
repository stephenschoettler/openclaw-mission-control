import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';
import { OPENCLAW_HOME, MAIN_AGENT_ALIAS, MAIN_AGENT_NAME } from '@/config';

/**
 * GET /api/automation/ralph-complete
 *
 * Automation endpoint polled every ~15s from the client.
 * - If Ralph posted task_end since last check → move all 'review' tasks to 'done', clear ralph + code-monkey to idle
 * - If code-monkey posted task_end since last check → clear code-monkey to idle
 *
 * Uses DB-backed automation_state to track last processed activity IDs so a
 * single event is never processed twice across restarts or concurrent requests.
 */

function getState(key: string): number {
  const row = db.prepare('SELECT value FROM automation_state WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? parseInt(row.value, 10) : 0;
}

function setState(key: string, value: number) {
  db.prepare(`
    INSERT INTO automation_state (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, String(value));
}

export async function GET() {
  const results: string[] = [];

  const lastRalphId = getState('last_processed_ralph_id');
  const lastMonkeyId = getState('last_processed_monkey_id');

  // ── 1. Ralph completed a review ─────────────────────────────────────────────
  const ralphEnd = db.prepare(`
    SELECT id, title FROM activity_feed
    WHERE agent_id = 'ralph'
      AND event_type = 'task_end'
      AND id > ?
    ORDER BY id DESC
    LIMIT 1
  `).get(lastRalphId) as { id: number; title: string } | undefined;

  if (ralphEnd) {
    setState('last_processed_ralph_id', ralphEnd.id);

    const isRejected = ralphEnd.title.includes('REJECTED') || ralphEnd.title.includes('❌') || ralphEnd.title.toLowerCase().includes('rejected');

    let updated;
    if (isRejected) {
      updated = db.prepare(`
        UPDATE tasks
        SET status = 'backlog', rejection_count = rejection_count + 1, updated_at = datetime('now')
        WHERE status = 'review'
      `).run();
    } else {
      updated = db.prepare(`
        UPDATE tasks
        SET status = 'done', updated_at = datetime('now')
        WHERE status = 'review'
      `).run();
    }

    if (updated.changes > 0) {
      if (isRejected) {
        results.push(`Ralph REJECTED: moved ${updated.changes} review task(s) to backlog`);
      } else {
        results.push(`Moved ${updated.changes} review task(s) to done`);
      }

      // Append to daily memory file
      try {
        const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
        const memDir = path.join(OPENCLAW_HOME, 'workspace', 'memory');
        const memPath = path.join(memDir, `${date}.md`);
        fs.mkdirSync(memDir, { recursive: true });
        const memEntry = isRejected
          ? `\n- ❌ Ralph rejected: ${updated.changes} task(s) moved to backlog (${date})\n`
          : `\n- ✅ Ralph approved: ${updated.changes} task(s) moved to done (${date})\n`;
        fs.appendFileSync(memPath, memEntry, 'utf8');
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

    // Clear main agent to idle
    db.prepare(`
      INSERT INTO office_status (agent_id, agent_name, role, current_task, status)
      VALUES (?, ?, 'engineering', '', 'idle')
      ON CONFLICT(agent_id) DO UPDATE SET
        current_task = '',
        status = 'idle',
        updated_at = datetime('now')
    `).run('code-monkey', 'Code Monkey');

    results.push('Cleared ralph + code-monkey to idle');
  }

  // ── 2. Code-monkey finished a task (no ralph event this cycle) ───────────────
  if (!ralphEnd) {
    const monkeyEnd = db.prepare(`
      SELECT id FROM activity_feed
      WHERE agent_id = 'code-monkey'
        AND event_type = 'task_end'
        AND id > ?
      ORDER BY id DESC
      LIMIT 1
    `).get(lastMonkeyId) as { id: number } | undefined;

    if (monkeyEnd) {
      setState('last_processed_monkey_id', monkeyEnd.id);

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
