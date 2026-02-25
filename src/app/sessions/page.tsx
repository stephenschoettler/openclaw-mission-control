'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Monitor, Clock } from 'lucide-react';

interface Session {
  session_key: string;
  agent_id: string;
  agent_name: string;
  model: string;
  context_tokens: number;
  context_pct: number;
  total_tokens: number;
  status: 'active' | 'idle';
  last_active: string;
  session_type: string;
}

function relativeTime(iso: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function ContextBar({ pct }: { pct: number }) {
  let colorClass = 'bg-green-500';
  if (pct >= 80) colorClass = 'bg-red-500';
  else if (pct >= 60) colorClass = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span
        className={`text-[11px] font-mono font-medium ${
          pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-yellow-400' : 'text-green-400'
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  main: 'text-indigo-400 bg-indigo-500/15',
  telegram: 'text-blue-400 bg-blue-500/15',
  cron: 'text-purple-400 bg-purple-500/15',
  subagent: 'text-cyan-400 bg-cyan-500/15',
  group: 'text-amber-400 bg-amber-500/15',
  other: 'text-neutral-400 bg-neutral-500/10',
};

const AGENT_EMOJIS: Record<string, string> = {
  'babbage': '🧠', 'main': '🧠',
  'code-monkey': '🐒', 'code-frontend': '🎨', 'code-backend': '⚙️', 'code-devops': '🛠️',
  'ralph': '🔍', 'answring': '📊', 'roadie': '🚗', 'tldr': '📝', 'hustle': '💼',
  'browser': '🌐', 'dev': '💻',
};

function getAgentEmoji(agentId: string): string {
  const lower = agentId.toLowerCase();
  for (const [key, emoji] of Object.entries(AGENT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🤖';
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data: Session[] = await res.json();
        setSessions(data);
        setLastRefresh(new Date());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => {
    const id = setInterval(fetchSessions, 15000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const idleSessions = sessions.filter(s => s.status === 'idle');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold gradient-text tracking-tight">Active Sessions</h1>
          <p className="text-sm text-neutral-500 mt-1">Live agent context windows — auto-refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[11px] text-neutral-600 font-mono">
              {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          )}
          <button
            onClick={fetchSessions}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-[11px] text-neutral-500 font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{activeSessions.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-neutral-500" />
            <span className="text-[11px] text-neutral-500 font-medium">Idle (24h)</span>
          </div>
          <p className="text-2xl font-bold text-white">{idleSessions.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Monitor size={12} className="text-indigo-400" />
            <span className="text-[11px] text-neutral-500 font-medium">Total (24h)</span>
          </div>
          <p className="text-2xl font-bold text-white">{sessions.length}</p>
        </div>
      </div>

      {/* Sessions table */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="w-6 h-6 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Loading sessions…</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-8 text-center">
          <Activity size={24} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No sessions in the last 24 hours</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Agent</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Model</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide w-[180px]">Context Fill</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Tokens</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Type</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr
                  key={s.session_key}
                  className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                    i === sessions.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <span className="text-lg leading-none">{getAgentEmoji(s.agent_id)}</span>
                        {s.status === 'active' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0a0a0f] bg-green-400 pulse-dot" />
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white">{s.agent_name}</p>
                        <p className="text-[10px] text-neutral-600 font-mono truncate max-w-[120px]">{s.agent_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-neutral-300 font-mono">{s.model}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ContextBar pct={s.context_pct} />
                    {s.context_tokens > 0 && (
                      <p className="text-[10px] text-neutral-700 mt-0.5 font-mono">
                        {formatTokens(s.total_tokens)} / {formatTokens(s.context_tokens)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[12px] text-neutral-300 font-mono">{formatTokens(s.total_tokens)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[s.session_type] || TYPE_COLORS.other}`}>
                      {s.session_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock size={10} className="text-neutral-600" />
                      <span className="text-[12px] text-neutral-400 font-mono">{relativeTime(s.last_active)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
