import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  // Total all-time completed (archived)
  const totalArchived = (db.prepare('SELECT COUNT(*) as cnt FROM completed_tasks').get() as { cnt: number }).cnt;

  // Today's done tasks from active tasks table (not yet archived)
  const todayDone = (db.prepare(
    `SELECT COUNT(*) as cnt FROM tasks WHERE status = 'done'
     AND date(updated_at) = date('now')`
  ).get() as { cnt: number }).cnt;

  const totalAllTime = totalArchived + todayDone;

  // Last 14 days — completed per day (from completed_tasks, archived_at date)
  const last14Archived = db.prepare(`
    SELECT date(archived_at) as day, COUNT(*) as count
    FROM completed_tasks
    WHERE archived_at >= date('now', '-13 days')
    GROUP BY day
    ORDER BY day ASC
  `).all() as { day: string; count: number }[];

  // Today's done (not yet archived) — add to today's bucket
  const todayStr = new Date().toISOString().slice(0, 10);

  // Build a map for the last 14 days
  const dayMap: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of last14Archived) {
    if (dayMap[row.day] !== undefined) dayMap[row.day] = row.count;
  }
  dayMap[todayStr] = (dayMap[todayStr] || 0) + todayDone;

  const perDay = Object.entries(dayMap).map(([day, count]) => ({ day, count }));

  // By assignee (all time)
  const byAssigneeArchived = db.prepare(`
    SELECT assignee, COUNT(*) as count
    FROM completed_tasks
    GROUP BY assignee
    ORDER BY count DESC
  `).all() as { assignee: string; count: number }[];

  // Add today's done from active tasks
  const todayByAssignee = db.prepare(`
    SELECT assignee, COUNT(*) as count
    FROM tasks WHERE status = 'done'
    AND date(updated_at) = date('now')
    GROUP BY assignee
  `).all() as { assignee: string; count: number }[];

  const assigneeMap: Record<string, number> = {};
  for (const r of byAssigneeArchived) assigneeMap[r.assignee] = r.count;
  for (const r of todayByAssignee) assigneeMap[r.assignee] = (assigneeMap[r.assignee] || 0) + r.count;
  const byAssignee = Object.entries(assigneeMap)
    .map(([assignee, count]) => ({ assignee, count }))
    .sort((a, b) => b.count - a.count);

  // This week vs last week avg tasks/day
  // This week = last 7 days, last week = 7 days before that
  const thisWeekTotal = (db.prepare(`
    SELECT COUNT(*) as cnt FROM completed_tasks
    WHERE archived_at >= date('now', '-6 days')
  `).get() as { cnt: number }).cnt + todayDone;

  const lastWeekTotal = (db.prepare(`
    SELECT COUNT(*) as cnt FROM completed_tasks
    WHERE archived_at >= date('now', '-13 days')
    AND archived_at < date('now', '-6 days')
  `).get() as { cnt: number }).cnt;

  const avgThisWeek = Math.round((thisWeekTotal / 7) * 10) / 10;
  const avgLastWeek = Math.round((lastWeekTotal / 7) * 10) / 10;

  return NextResponse.json({
    totalAllTime,
    perDay,
    byAssignee,
    avgThisWeek,
    avgLastWeek,
  });
}
