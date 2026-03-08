'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ListTodo, CalendarDays, Inbox, Activity, Users, TrendingUp, AlertCircle, DollarSign, Server, Zap } from 'lucide-react';

interface AgentStation {
  agent_id: string;
  agent_name: string;
  status: string;
  current_task: string;
  lastActiveMs: number;
  model: string;
  totalTokens: number;
  contextTokens: number;
}

const DISPLAY_NAMES: Record<string, string> = {
  main: 'Babbage', answring: 'Maya', 'answring-sales': 'Sal',
  'answring-qa': 'Quinn', 'answring-strategist': 'Stella', 'answring-ops': 'Opie',
  'answring-dev': 'Devin', 'answring-marketing': 'Marcus', 'answring-security': 'Cera',
  'code-monkey': 'Code Monkey', 'code-frontend': 'Frontend', 'code-backend': 'Backend',
  'code-devops': 'DevOps', 'code-webdev': 'WebDev', ralph: 'Ralph', tldr: 'Cliff',
  browser: 'Crawler', forge: 'Forge', hustle: 'Hustle', roadie: 'Roadie', docs: 'The Professor',
  pixel: 'Pixel',
};

interface ApprovalItem {
  id: number;
  title: string;
  agent: string;
  type: string;
  status: string;
}

interface LiveSession {
  id: string;
  agent_id: string;
  agent_name: string;
  model: string | null;
  totalTokens: number;
  contextTokens: number;
  contextPct: number | null;
  ageMs: number;
  sessionId: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
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

interface TodoItem {
  title: string;
  date: string;
  action: string;
  problem: string;
  files: string;
  solution: string;
}

interface AgentTodos {
  agentId: string;
  workspacePath: string;
  todos: TodoItem[];
}

function parseUtc(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(0);
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

function timeAgoMs(ms: number): string {
  if (!ms) return 'Never';
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

function formatEventDate(date: string, time: string): string {
  const d = new Date(`${date}T${time || '00:00'}`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }) +
    (time ? ` · ${time}` : '');
}

function shortModel(model: string): string {
  if (!model) return '?';
  return model.replace('claude-', '').replace(/-\d+$/, '');
}

export default function CommandCenterPage() {
  const [stations, setStations] = useState<AgentStation[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [agentTodos, setAgentTodos] = useState<AgentTodos[]>([]);
  const [hasEvents, setHasEvents] = useState(false);
  const [gateway, setGateway] = useState<GatewayInfo | null>(null);
  const [todayCost, setTodayCost] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [oRes, aRes, liveRes, eRes, tRes, gwRes, costRes] = await Promise.all([
        fetch('/api/office'),
        fetch('/api/approvals?status=pending'),
        fetch('/api/activity/live'),
        fetch('/api/events').catch(() => null),
        fetch('/api/todos'),
        fetch('/api/gateway').catch(() => null),
        fetch('/api/costs').catch(() => null),
      ]);

      if (oRes.ok) {
        const oData = await oRes.json();
        const agents = Array.isArray(oData) ? oData : oData.agents || [];
        setStations(agents.map((a: any) => ({
          agent_id: a.id,
          agent_name: DISPLAY_NAMES[a.id] || a.name || 'Unknown',
          status: a.status,
          current_task: a.lastTask || '',
          lastActiveMs: a.lastActiveMs || 0,
          model: a.model || '',
          totalTokens: a.totalTokens || 0,
          contextTokens: a.contextTokens || 0,
        })));
      }
      if (aRes.ok) setApprovals(await aRes.json());
      if (liveRes.ok) {
        setLiveSessions(await liveRes.json());
      }
      if (tRes.ok) {
          const todosData = await tRes.json();
          setAgentTodos(todosData?.agents ?? []);
        }
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

  const workingAgents = stations.filter(s => s.status === 'working');
  const totalTodos = agentTodos.reduce((sum, a) => sum + a.todos.length, 0);

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

      {/* Live Sessions — from gateway, accurate to the second */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
            <Zap size={14} className="text-green-400" />
            Live Sessions
            {liveSessions.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                {liveSessions.length} active
              </span>
            )}
          </h2>
          <Link href="/team" className="text-[11px] text-neutral-500 hover:text-indigo-400 transition-colors">View Team →</Link>
        </div>

        {liveSessions.length === 0 ? (
          <div className="py-6 px-4 text-center border border-dashed border-white/[0.05] rounded-xl">
            <p className="text-xs text-neutral-600">No active sessions</p>
            <p className="text-[10px] text-neutral-700 mt-0.5">Sessions appear here when agents are running — data from gateway</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveSessions.map(sess => (
              <div key={sess.id} className="card p-4 border-green-500/20 shimmer-hover relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500/0 via-green-500/60 to-green-500/0" />
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                      {sess.agent_name.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0f] bg-green-400 pulse-dot" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{sess.agent_name}</p>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{shortModel(sess.model || '')}</p>
                    {/* Context fill bar */}
                    {sess.contextPct !== null && (
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-neutral-600">Context</span>
                          <span className="text-[9px] text-neutral-400 font-mono">{sess.contextPct}%</span>
                        </div>
                        <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              sess.contextPct > 80 ? 'bg-red-500' : sess.contextPct > 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(sess.contextPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-neutral-700 mt-1">{timeAgoMs(sess.ageMs)}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                <ListTodo size={14} className="text-purple-400" />
                Agent To-Dos
              </h3>
              <Link href="/todos" className="text-[11px] text-neutral-500 hover:text-purple-400 transition-colors">View All →</Link>
            </div>
            <div className="space-y-2">
              {agentTodos.length === 0 ? (
                <p className="text-xs text-neutral-600 py-2">No todos found in agent workspaces.</p>
              ) : (
                agentTodos.flatMap(a => a.todos.slice(0, 2).map((todo, i) => (
                  <div key={`${a.agentId}-${i}`} className="flex items-start gap-2 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-indigo-400 mr-1">[{a.agentId}]</span>
                      <span className="text-xs text-neutral-300">{todo.action}</span>
                      {todo.problem && <span className="text-[10px] text-neutral-500"> — {todo.problem}</span>}
                    </div>
                  </div>
                ))).slice(0, 5)
              )}
              {totalTodos > 5 && (
                <p className="text-[10px] text-neutral-600 pt-1">+{totalTodos - 5} more</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

        <Link href="/todos" className="card p-4 shimmer-hover block relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
              <ListTodo size={15} className="text-purple-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Todos</span>
          </div>
          <p className={`text-2xl font-extrabold ${totalTodos === 0 ? 'text-neutral-600' : 'text-purple-400'}`}>{totalTodos}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">across all agents</p>
        </Link>

        <div className="card p-4 shimmer-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
              <Activity size={15} className="text-green-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Active</span>
          </div>
          <p className={`text-2xl font-extrabold ${workingAgents.length === 0 ? 'text-neutral-600' : 'text-green-400'}`}>{workingAgents.length}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">agents working</p>
        </div>

        <div className="card p-4 shimmer-hover relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
              <TrendingUp size={15} className="text-indigo-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-semibold tracking-wide">Todo Agents</span>
          </div>
          <p className={`text-2xl font-extrabold ${agentTodos.length === 0 ? 'text-neutral-600' : 'text-white'}`}>{agentTodos.length}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">with active todos</p>
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
