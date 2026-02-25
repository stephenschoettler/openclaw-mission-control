'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';

interface ActivityEntry {
  id: number;
  agent_id: string;
  agent_name: string;
  event_type: 'task_start' | 'task_end' | 'spawn' | 'message' | 'approval' | 'status_change' | 'system';
  title: string;
  detail: string | null;
  created_at: string;
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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
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
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${cfg.bg} border ${cfg.border}`}>
          {emoji}
        </div>
        <div className="w-px flex-1 bg-white/[0.05] mt-1" />
      </div>

      {/* Card */}
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

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const lastSeenId = useRef(0);

  const fetchEntries = useCallback(async () => {
    try {
      const url = filter ? `/api/activity?agent_id=${encodeURIComponent(filter)}` : '/api/activity';
      const res = await fetch(url);
      const data: ActivityEntry[] = await res.json();
      setEntries(data);
      if (data.length > 0 && data[0].id > lastSeenId.current) {
        lastSeenId.current = data[0].id;
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => {
    const id = setInterval(fetchEntries, 10000);
    return () => clearInterval(id);
  }, [fetchEntries]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold gradient-text tracking-tight flex items-center gap-2">
            <Activity size={28} className="text-indigo-400" />
            Activity Feed
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Live stream of agent events</p>
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

      {loading ? (
        <div className="py-20 text-center text-neutral-600 text-sm">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-neutral-600 text-sm">No activity yet</p>
          <p className="text-neutral-700 text-xs mt-1">Events will appear here as agents report them</p>
        </div>
      ) : (
        <div className="space-y-0">
          {entries.map(entry => (
            <ActivityCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
