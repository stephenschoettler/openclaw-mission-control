'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react';

type Period = 'today' | '7d' | '30d';

interface AgentCost {
  agent: string;
  agent_id: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
}

interface DayEntry {
  date: string;
  cost: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface PeriodData {
  total: number;
  byAgent: AgentCost[];
  byDay: DayEntry[];
}

interface CostsData {
  today: PeriodData;
  '7d': PeriodData;
  '30d': PeriodData;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function formatCost(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.001) return `$${(n * 1000).toFixed(3)}m`;
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function BarChart({ data }: { data: DayEntry[] }) {
  if (data.length === 0) return (
    <div className="h-32 flex items-center justify-center text-xs text-neutral-600">No data for this period</div>
  );

  const maxCost = Math.max(...data.map(d => d.cost), 0.001);

  return (
    <div className="flex items-end gap-1 h-32 px-2">
      {data.map((day) => {
        const heightPct = (day.cost / maxCost) * 100;
        const isToday = day.date === new Date().toISOString().substring(0, 10);
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1 group relative"
            title={`${day.date}: ${formatCost(day.cost)}`}
          >
            <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
              <div
                className={`w-full rounded-t transition-all ${
                  isToday ? 'bg-indigo-500' : 'bg-indigo-500/40 group-hover:bg-indigo-500/60'
                }`}
                style={{ height: `${Math.max(heightPct, day.cost > 0 ? 2 : 0)}%` }}
              />
            </div>
            {/* Label for every ~7th bar or if very few */}
            {(data.length <= 7 || data.indexOf(day) % Math.ceil(data.length / 7) === 0) && (
              <span className="text-[8px] text-neutral-700 font-mono">
                {day.date.substring(5)}
              </span>
            )}
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-[#1a1a2e] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-mono whitespace-nowrap">
              {day.date.substring(5)}: {formatCost(day.cost)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CostsPage() {
  const [data, setData] = useState<CostsData | null>(null);
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchCosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/costs');
      if (res.ok) {
        const d: CostsData = await res.json();
        setData(d);
        setLastRefresh(new Date());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCosts(); }, [fetchCosts]);
  useEffect(() => {
    const id = setInterval(fetchCosts, 60000);
    return () => clearInterval(id);
  }, [fetchCosts]);

  const current: PeriodData = data?.[period] || { total: 0, byAgent: [], byDay: [] };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold gradient-text tracking-tight">Token Costs</h1>
          <p className="text-sm text-neutral-500 mt-1">Usage and spend across all agents — refreshes every 60s</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[11px] text-neutral-600 font-mono">
              {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          )}
          <button
            onClick={fetchCosts}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
              <DollarSign size={14} className="text-green-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-medium">Today</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCost(data?.today.total || 0)}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            {(data?.today.byAgent.reduce((s, a) => s + a.total_tokens, 0) || 0).toLocaleString()} tokens
          </p>
        </div>

        <div className="card p-4 col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <TrendingUp size={14} className="text-indigo-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-medium">7 Days</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCost(data?.['7d'].total || 0)}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            {(data?.['7d'].byAgent.reduce((s, a) => s + a.total_tokens, 0) || 0).toLocaleString()} tokens
          </p>
        </div>

        <div className="card p-4 col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <TrendingUp size={14} className="text-purple-400" />
            </div>
            <span className="text-[11px] text-neutral-500 font-medium">30 Days</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCost(data?.['30d'].total || 0)}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            {(data?.['30d'].byAgent.reduce((s, a) => s + a.total_tokens, 0) || 0).toLocaleString()} tokens
          </p>
        </div>
      </div>

      {/* Period tab switcher */}
      <div className="flex gap-2 mb-5">
        {(['today', '7d', '30d'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              period === p
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-neutral-500 hover:text-neutral-200 bg-white/[0.03] border border-white/[0.06]'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <div className="w-6 h-6 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Loading cost data…</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {/* Agent cost table — 3/5 width */}
          <div className="col-span-3 card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Cost by Agent — {PERIOD_LABELS[period]}</h3>
              {current.byAgent.length === 0 && (
                <p className="text-xs text-neutral-600 mt-1">No cost data for this period</p>
              )}
            </div>
            {current.byAgent.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Agent</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Input</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Output</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {current.byAgent.map((a, i) => {
                    const maxCost = current.byAgent[0]?.cost || 1;
                    const barWidth = (a.cost / maxCost) * 100;
                    return (
                      <tr
                        key={a.agent_id}
                        className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                          i === current.byAgent.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getAgentEmoji(a.agent_id)}</span>
                            <div>
                              <p className="text-[12px] font-medium text-white">{a.agent}</p>
                              <div className="mt-0.5 h-1 bg-white/[0.05] rounded-full overflow-hidden w-20">
                                <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[11px] text-neutral-400 font-mono">{formatTokens(a.input_tokens)}</td>
                        <td className="px-3 py-2.5 text-right text-[11px] text-neutral-400 font-mono">{formatTokens(a.output_tokens)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-[13px] font-bold text-green-400">{formatCost(a.cost)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.08]">
                    <td className="px-4 py-2.5 text-[11px] font-semibold text-neutral-500">TOTAL</td>
                    <td className="px-3 py-2.5 text-right text-[11px] text-neutral-400 font-mono">
                      {formatTokens(current.byAgent.reduce((s, a) => s + a.input_tokens, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] text-neutral-400 font-mono">
                      {formatTokens(current.byAgent.reduce((s, a) => s + a.output_tokens, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-[13px] font-bold text-white">{formatCost(current.total)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Daily bar chart — 2/5 width */}
          <div className="col-span-2 card p-4">
            <h3 className="text-sm font-semibold text-white mb-1">Daily Spend</h3>
            <p className="text-[10px] text-neutral-600 mb-4">{PERIOD_LABELS[period]}</p>
            <BarChart data={current.byDay} />
            {current.byDay.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-neutral-600">Peak day</p>
                  <p className="text-[13px] font-bold text-white">
                    {formatCost(Math.max(...current.byDay.map(d => d.cost)))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-600">Avg / day</p>
                  <p className="text-[13px] font-bold text-white">
                    {formatCost(current.byDay.filter(d => d.cost > 0).length
                      ? current.total / current.byDay.filter(d => d.cost > 0).length
                      : 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
