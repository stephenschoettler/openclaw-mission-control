'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Activity } from 'lucide-react';

interface TodoItem {
  title: string;
  date: string;
  action: string;
  problem: string;
  files: string;
  solution: string;
}

interface CompletedItem {
  action: string;
  completedAt: string;
}

interface AgentTodos {
  agentId: string;
  workspacePath: string;
  todos: TodoItem[];
  completed: CompletedItem[];
}

interface TodosResponse {
  agents: AgentTodos[];
}

interface ActivityEntry {
  id: number;
  agent_id: string;
  agent_name: string;
  event_type: 'task_start' | 'task_end' | 'spawn' | 'message' | 'approval' | 'status_change' | 'system';
  title: string;
  detail: string | null;
  created_at: string;
}

const AGENT_COLORS: Record<string, string> = {
  main:            'text-violet-400 bg-violet-500/15',
  'code-monkey':   'text-blue-400 bg-blue-500/15',
  'code-backend':  'text-cyan-400 bg-cyan-500/15',
  'code-frontend': 'text-pink-400 bg-pink-500/15',
  'code-security': 'text-red-400 bg-red-500/15',
  'code-docs':     'text-amber-400 bg-amber-500/15',
  ralph:           'text-emerald-400 bg-emerald-500/15',
  pixel:           'text-purple-400 bg-purple-500/15',
};

function agentColor(id: string) {
  return AGENT_COLORS[id] || 'text-neutral-400 bg-neutral-500/15';
}

function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const EVENT_TYPE_CONFIG: Record<ActivityEntry['event_type'], { label: string; color: string; bg: string; border: string }> = {
  task_start: { label: 'Task Start', color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30' },
  task_end:   { label: 'Task End',   color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30'  },
  spawn:      { label: 'Spawn',      color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
  message:    { label: 'Message',    color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30'   },
  approval:   { label: 'Approval',   color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30'  },
  status_change: { label: 'Status',  color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30'   },
  system:     { label: 'System',     color: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20' },
};

const AGENT_EMOJIS: Record<string, string> = {
  'babbage':       '🧠',
  'code-monkey':   '🐒',
  'code-frontend': '🎨',
  'code-backend':  '⚙️',
  'code-devops':   '🛠️',
  'ralph':         '🔍',
  'system':        '🖥️',
};

function getAgentEmoji(agentId: string): string {
  const lower = agentId.toLowerCase();
  for (const [key, emoji] of Object.entries(AGENT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🤖';
}

function parseUtc(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
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

function ActivityCard({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_TYPE_CONFIG[entry.event_type] || EVENT_TYPE_CONFIG.system;
  const emoji = getAgentEmoji(entry.agent_id);

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${cfg.bg} border ${cfg.border}`}>
          {emoji}
        </div>
        <div className="w-px flex-1 bg-white/[0.05] mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className="card p-3.5 shimmer-hover">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 mt-0.5 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                {cfg.label}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-snug">{entry.title}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">{entry.agent_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-neutral-600 font-mono">{relativeTime(entry.created_at)}</span>
              {entry.detail && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>
          {expanded && entry.detail && (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
              <p className="text-[11px] text-neutral-400 font-mono whitespace-pre-wrap break-words">{entry.detail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TodosPage() {
  const [data, setData] = useState<TodosResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const [allEntries, setAllEntries] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const entries = filter
    ? allEntries.filter(e => e.agent_id.toLowerCase().includes(filter.toLowerCase()) || e.agent_name.toLowerCase().includes(filter.toLowerCase()))
    : allEntries;

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/activity');
      const actData: ActivityEntry[] = await res.json();
      setAllEntries(actData);
    } catch {
      // silently fail
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);
  useEffect(() => {
    const id = setInterval(fetchTodos, 60000);
    return () => clearInterval(id);
  }, [fetchTodos]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => {
    const id = setInterval(fetchEntries, 10000);
    return () => clearInterval(id);
  }, [fetchEntries]);

  const agents = data?.agents ?? [];
  const totalTodos = agents.reduce((sum, a) => sum + a.todos.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Todos Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Agent To-Dos</h2>
            {lastUpdated && (
              <p className="text-[11px] text-neutral-600 mt-0.5">Updated {formatLastUpdated(lastUpdated)} · refreshes every 60s</p>
            )}
          </div>
          <button
            onClick={fetchTodos}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-neutral-600 text-sm">Loading todos…</div>
        )}

        {!loading && agents.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-neutral-500 text-sm">No TO-DOS.md files found in any agent workspace.</p>
            <p className="text-neutral-600 text-xs mt-2">Create a TO-DOS.md in ~/.openclaw/workspace[-name]/ to see todos here.</p>
          </div>
        )}

        {!loading && agents.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-neutral-500">{totalTodos} todo{totalTodos !== 1 ? 's' : ''} across {agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-6">
              {agents.map((agent) => (
                <div key={agent.agentId} className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${agentColor(agent.agentId)}`}>
                      {agent.agentId}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-mono truncate">{agent.workspacePath}</span>
                    <span className="ml-auto text-[10px] text-neutral-600">{agent.todos.length} item{agent.todos.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-2">
                    {agent.todos.map((todo, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${agentColor(agent.agentId)}`}>
                                {agent.agentId}
                              </span>
                              <span className="text-sm font-medium text-white">{todo.action}</span>
                              {todo.problem && (
                                <>
                                  <span className="text-neutral-600">—</span>
                                  <span className="text-xs text-neutral-400 truncate max-w-[300px]">{todo.problem}</span>
                                </>
                              )}
                              {todo.files && (
                                <span className="text-[10px] text-neutral-600 font-mono truncate max-w-[200px]">({todo.files})</span>
                              )}
                            </div>
                            {(todo.title || todo.date) && (
                              <div className="mt-1 flex items-center gap-2">
                                {todo.title && <span className="text-[10px] text-neutral-600">{todo.title}</span>}
                                {todo.date && <span className="text-[10px] text-neutral-700">· {todo.date}</span>}
                              </div>
                            )}
                            {todo.solution && (
                              <p className="text-[11px] text-green-400/70 mt-1">→ {todo.solution}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Completed items */}
                    {agent.completed && agent.completed.length > 0 && agent.completed.map((item, i) => (
                      <div key={`done-${i}`} className="px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center gap-2 opacity-60">
                        <span className="text-base leading-none">✅</span>
                        <span className="text-xs text-neutral-500 line-through">{item.action}</span>
                        {item.completedAt && (
                          <span className="text-[10px] text-neutral-700 font-mono ml-auto shrink-0">{item.completedAt}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Activity Feed Section */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Activity size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Activity Feed</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Live stream of agent events</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-[11px] text-neutral-500">Live · refreshes every 10s</span>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Filter by agent ID..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {activityLoading ? (
          <div className="card py-20 text-center text-neutral-600 text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="card py-16 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
              <Activity size={20} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">No activity yet</p>
              <p className="text-xs text-neutral-700 mt-1">Events will appear here as agents report them</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {entries.map(entry => (
              <ActivityCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
