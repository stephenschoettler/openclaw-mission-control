'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckSquare, CalendarDays, Inbox, Activity, Clock, Users, TrendingUp, AlertCircle, DollarSign, Server } from 'lucide-react';

interface OfficeStation {
  agent_id: string;
  agent_name: string;
  status: string;
  current_task: string;
  updated_at: string;
}

interface ApprovalItem {
  id: number;
  title: string;
  agent: string;
  type: string;
  status: string;
}

interface ActivityEntry {
  id: number;
  agent_id: string;
  agent_name: string;
  event_type: string;
  title: string;
  detail: string | null;
  created_at: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
}

interface Task {
  id: number;
  status: string;
  updated_at: string;
}

interface GatewayInfo {
  status: 'online' | 'offline';
  pid: number | null;
  uptime: string;
  memory: string;
  rss_kb: number;
  primary_model: string;
  compaction_mode: string;
  agents_count: number;
  skills_count: number;
}

const EVENT_COLORS: Record<string, string> = {
  task_start:    'text-indigo-400 bg-indigo-500/15',
  task_end:      'text-green-400 bg-green-500/15',
  spawn:         'text-purple-400 bg-purple-500/15',
  message:       'text-blue-400 bg-blue-500/15',
  approval:      'text-amber-400 bg-amber-500/15',
  status_change: 'text-cyan-400 bg-cyan-500/15',
  system:        'text-neutral-400 bg-neutral-500/10',
};

const AGENT_EMOJIS: Record<string, string> = {
  'babbage': '🧠', 'code-monkey': '🐒', 'code-frontend': '🎨',
  'code-backend': '⚙️', 'code-devops': '🛠️', 'ralph': '🔍', 'system': '🖥️',
};

function getAgentEmoji(agentId: string): string {
  const lower = agentId.toLowerCase();
  for (const [key, emoji] of Object.entries(AGENT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🤖';
}

function parseUtc(dateStr: string): Date {
  // SQLite timestamps are UTC "YYYY-MM-DD HH:MM:SS" — append 'Z' to force UTC parsing.
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

/** If an agent is "working" but updated_at is >10 min old, treat as idle in UI */
function resolveStatus(status: string, updatedAt: string): string {
  if (status !== 'working') return status;
  const ageMs = Date.now() - parseUtc(updatedAt).getTime();
  return ageMs > 10 * 60 * 1000 ? 'idle' : 'working';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - parseUtc(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatEventDate(date: string, time: string): string {
  const d = new Date(`${date}T${time || '00:00'}`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }) +
    (time ? ` · ${time}` : '');
}

export default function CommandCenterPage() {
  const [stations, setStations] = useState<OfficeStation[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasEvents, setHasEvents] = useState(false);
  const [gateway, setGateway] = useState<GatewayInfo | null>(null);
  const [todayCost, setTodayCost] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [oRes, aRes, actRes, eRes, tRes, gwRes, costRes] = await Promise.all([
        fetch('/api/office'),
        fetch('/api/approvals?status=pending'),
        fetch('/api/activity'),
        fetch('/api/events').catch(() => null),
        fetch('/api/tasks'),
        fetch('/api/gateway').catch(() => null),
        fetch('/api/costs').catch(() => null),
      ]);

      if (oRes.ok) setStations(await oRes.json());
      if (aRes.ok) setApprovals(await aRes.json());
      if (actRes.ok) {
        const actData: ActivityEntry[] = await actRes.json();
        setActivity(actData.slice(0, 5));
      }
      if (tRes.ok) setTasks(await tRes.json());
      if (gwRes && gwRes.ok) setGateway(await gwRes.json());
      if (costRes && costRes.ok) {
        try {
          const cd: { today: { total: number } } = await costRes.json();
          setTodayCost(cd?.today?.total ?? null);
        } catch { /* ignore */ }
      }

      if (eRes && eRes.ok) {
        try {
          const evData: CalendarEvent[] = await eRes.json();
          const upcoming = evData
            .filter(e => new Date(`${e.date}T${e.time || '00:00'}`) >= new Date())
            .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime())
            .slice(0, 2);
          setEvents(upcoming);
          setHasEvents(upcoming.length > 0);
        } catch {
          setHasEvents(false);
        }
      }
    } catch {
      // silently fail — keep stale data visible
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const id = setInterval(fetchAll, 15000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const workingAgents = stations.filter(s => resolveStatus(s.status, s.updated_at) === 'working');
  const taskCounts = {
    todo: tasks.filter(t => t.status === 'backlog').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };
  const totalTasks = tasks.length;
  const donePercent = totalTasks > 0 ? Math.round((taskCounts.done / totalTasks) * 100) : 0;
  const todayPst = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date()); // "YYYY-MM-DD" in PST
  const doneToday = tasks.filter(t => t.status === 'done' && t.updated_at && new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(parseUtc(t.updated_at)) === todayPst).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Overview</h2>
        <p className="text-sm text-neutral-500 mt-1">Live fleet status — refreshes every 15s</p>
      </div>

      {/* Gateway Health Strip */}
      {gateway && (
        <div className={`mb-5 px-4 py-2.5 rounded-xl border flex items-center gap-4 text-[12px] ${
          gateway.status === 'online'
            ? 'bg-green-500/5 border-green-500/15'
            : 'bg-red-500/5 border-red-500/15'
        }`}>
          <div className="flex items-center gap-2 shrink-0">
            <Server size={13} className={gateway.status === 'online' ? 'text-green-400' : 'text-red-400'} />
            <span className={`font-semibold ${gateway.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
              ● Gateway {gateway.status === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          {gateway.status === 'online' && (
            <>
              {gateway.pid && (
                <span className="text-neutral-600 font-mono">PID {gateway.pid}</span>
              )}
              {gateway.uptime && (
                <span className="text-neutral-500">Up <span className="text-neutral-300 font-mono">{gateway.uptime}</span></span>
              )}
              {gateway.memory && (
                <span className="text-neutral-500">Mem <span className="text-neutral-300 font-mono">{gateway.memory}</span></span>
              )}
              {gateway.primary_model && (
                <span className="text-neutral-500">Model <span className="text-neutral-300 font-mono text-[11px]">{gateway.primary_model}</span></span>
              )}
              {gateway.agents_count > 0 && (
                <span className="text-neutral-500">{gateway.agents_count} agents</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Active Agents — prominent at top */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
            <Users size={14} className="text-green-400" />
            Active Agents
            {workingAgents.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                {workingAgents.length} working
              </span>
            )}
          </h2>
          <Link href="/office" className="text-[11px] text-neutral-500 hover:text-indigo-400 transition-colors">View Office →</Link>
        </div>

        {workingAgents.length === 0 ? (
          <div className="py-6 px-4 text-center border border-dashed border-white/[0.05] rounded-xl">
            <p className="text-xs text-neutral-600">No agents currently working</p>
            <p className="text-[10px] text-neutral-700 mt-0.5">Agents will appear here when they pick up tasks</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workingAgents.map(agent => (
              <div key={agent.agent_id} className="card p-4 border-green-500/20 shimmer-hover relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500/0 via-green-500/60 to-green-500/0" />
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                      {agent.agent_name.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0f] bg-green-400 pulse-dot" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{agent.agent_name}</p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{agent.current_task || 'Working...'}</p>
                    <p className="text-[10px] text-neutral-700 mt-1">Updated {relativeTime(agent.updated_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Idle agents summary */}
        {stations.filter(s => s.status !== 'working').length > 0 && (() => {
          const idleAgents = stations.filter(s => s.status !== 'working');
          const MAX_SHOW = 8;
          const shown = idleAgents.slice(0, MAX_SHOW);
          const overflow = idleAgents.length - MAX_SHOW;
          return (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-neutral-700 uppercase tracking-widest shrink-0">Also online</span>
              {shown.map(s => (
                <span key={s.agent_id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-neutral-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/50 shrink-0" />
                  {s.agent_name}
                </span>
              ))}
              {overflow > 0 && (
                <span className="text-[11px] text-neutral-600">+{overflow} more</span>
              )}
            </div>
          );
        })()}
      </section>

      {/* Middle row: Approvals + Activity + Events */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Pending Approvals */}
        <div className="card p-5 shimmer-hover relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Inbox size={14} className="text-amber-400" />
              Pending Approvals
            </h3>
            <Link href="/approvals" className="text-[11px] text-neutral-500 hover:text-amber-400 transition-colors">View →</Link>
          </div>
          {approvals.length === 0 ? (
            <div className="py-4 text-center border border-dashed border-white/[0.06] rounded-lg mt-2">
              <div className="text-3xl font-extrabold text-neutral-700">0</div>
              <p className="text-[11px] text-neutral-600 mt-1">All clear</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-4xl font-extrabold text-amber-400">{approvals.length}</div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={16} className="text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Needs review</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {approvals.slice(0, 3).map(a => (
                  <div key={a.id} className="text-[11px] text-neutral-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="truncate">{a.title}</span>
                  </div>
                ))}
                {approvals.length > 3 && (
                  <p className="text-[10px] text-neutral-600">+{approvals.length - 3} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity size={14} className="text-indigo-400" />
              Recent Activity
            </h3>
            <Link href="/activity" className="text-[11px] text-neutral-500 hover:text-indigo-400 transition-colors">View All →</Link>
          </div>
          {activity.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-white/[0.06] rounded-lg">
              <p className="text-xs text-neutral-600">No activity yet</p>
              <p className="text-[10px] text-neutral-700 mt-0.5">Events will appear here as agents report them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map(e => (
                <div key={e.id} className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{getAgentEmoji(e.agent_id)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${EVENT_COLORS[e.event_type] || 'text-neutral-400 bg-neutral-500/10'}`}>
                        {e.event_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-mono">{relativeTime(e.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 truncate mt-0.5">{e.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events or Pipeline */}
        {hasEvents ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CalendarDays size={14} className="text-green-400" />
                Upcoming Events
              </h3>
              <Link href="/calendar" className="text-[11px] text-neutral-500 hover:text-green-400 transition-colors">View →</Link>
            </div>
            <div className="space-y-3">
              {events.map(e => (
                <div key={e.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs font-medium text-white">{e.title}</p>
                  <p className="text-[10px] text-green-400 mt-1">{formatEventDate(e.date, e.time)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock size={14} className="text-purple-400" />
                Pipeline Health
              </h3>
              <Link href="/tasks" className="text-[11px] text-neutral-500 hover:text-purple-400 transition-colors">View Tasks →</Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-500" />
                  <span className="text-xs text-neutral-400">Backlog</span>
                </div>
                <span className="text-sm font-bold text-white">{taskCounts.todo}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-xs text-neutral-400">In Progress</span>
                </div>
                <span className="text-sm font-bold text-white">{taskCounts.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-neutral-400">Done</span>
                </div>
                <span className="text-sm font-bold text-white">{taskCounts.done}</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-neutral-500 font-medium">COMPLETION</span>
                  <span className="text-[11px] text-white font-bold">{donePercent}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(donePercent, donePercent > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Quick stats */}
      <div className="grid grid-cols-6 gap-3">
        <div className="card p-4 shimmer-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Users size={15} className="text-indigo-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Fleet Size</span>
          </div>
          <p className="text-2xl font-extrabold text-white">{stations.length}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">{workingAgents.length} working now</p>
        </div>

        <div className="card p-4 shimmer-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Inbox size={15} className="text-amber-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Approvals</span>
          </div>
          <p className={`text-2xl font-extrabold ${approvals.length > 0 ? 'text-amber-400' : 'text-white'}`}>{approvals.length}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">pending review</p>
        </div>

        <div className="card p-4 shimmer-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
              <CheckSquare size={15} className="text-purple-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Tasks</span>
          </div>
          <p className={`text-2xl font-extrabold ${taskCounts.inProgress === 0 ? 'text-neutral-600' : 'text-yellow-400'}`}>{taskCounts.inProgress}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">in progress</p>
        </div>

        <div className="card p-4 shimmer-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
              <CheckSquare size={15} className="text-green-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Done Today</span>
          </div>
          <p className={`text-2xl font-extrabold ${doneToday === 0 ? 'text-neutral-600' : 'text-green-400'}`}>{doneToday}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">completed today</p>
        </div>

        <div className="card p-4 shimmer-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
              <TrendingUp size={15} className="text-indigo-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Completion</span>
          </div>
          <p className={`text-2xl font-extrabold ${donePercent === 0 ? 'text-neutral-600' : 'text-white'}`}>{donePercent}%</p>
          <div className="mt-1.5 h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
            {donePercent > 0 ? (
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${donePercent}%` }} />
            ) : (
              <div className="h-full w-full rounded-full bg-white/[0.04]" />
            )}
          </div>
        </div>

        <Link href="/costs" className="card p-4 shimmer-hover block relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <DollarSign size={15} className="text-emerald-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Today&apos;s Cost</span>
          </div>
          <p className="text-2xl font-extrabold text-white">
            {todayCost !== null ? `$${todayCost.toFixed(2)}` : '—'}
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">token spend</p>
        </Link>
      </div>
    </div>
  );
}
