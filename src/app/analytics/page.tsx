'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, CheckCircle2, Users, BarChart2 } from 'lucide-react';

interface AnalyticsData {
  totalAllTime: number;
  perDay: { day: string; count: number }[];
  byAssignee: { assignee: string; count: number }[];
  avgThisWeek: number;
  avgLastWeek: number;
}

const ASSIGNEE_COLORS: Record<string, string> = {
  'sir': '#818cf8',
  'babbage': '#34d399',
  'code-monkey': '#f59e0b',
  'code-frontend': '#60a5fa',
  'code-backend': '#a78bfa',
  'code-devops': '#fb7185',
  'ralph': '#38bdf8',
  'me': '#6ee7b7',
};

function assigneeColor(a: string): string {
  return ASSIGNEE_COLORS[a.toLowerCase()] ?? '#94a3b8';
}

function formatDay(day: string): string {
  const d = new Date(day + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className={accent ?? 'text-indigo-400'} />
        <span className="text-[12px] text-neutral-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent leading-none">
        {value}
      </p>
      {sub && <div className="text-[12px] text-neutral-500">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#16162a] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] shadow-xl">
      <p className="text-neutral-400 mb-0.5">{label}</p>
      <p className="text-white font-semibold">{payload[0].value} tasks</p>
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/tasks')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const weekDelta = data ? data.avgThisWeek - data.avgLastWeek : 0;
  const weekUp = weekDelta >= 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
          Task Analytics
        </h1>
        <p className="text-[13px] text-neutral-500 mt-1">Historical task completion — all time</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-neutral-600 text-sm">Loading…</div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-red-400 text-sm">Failed to load analytics</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={CheckCircle2}
              label="All-time completed"
              value={data.totalAllTime}
              accent="text-green-400"
            />
            <StatCard
              icon={BarChart2}
              label="Avg / day this week"
              value={data.avgThisWeek}
              accent="text-indigo-400"
              sub={
                <span className={`flex items-center gap-1 ${weekUp ? 'text-green-400' : 'text-red-400'}`}>
                  {weekUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {weekUp ? '+' : ''}{Math.round(weekDelta * 10) / 10} vs last week ({data.avgLastWeek}/day)
                </span>
              }
            />
            <StatCard
              icon={Users}
              label="Top contributor"
              value={data.byAssignee[0]?.assignee ?? '—'}
              sub={data.byAssignee[0] ? `${data.byAssignee[0].count} tasks` : undefined}
              accent="text-purple-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Today"
              value={data.perDay[data.perDay.length - 1]?.count ?? 0}
              sub="tasks completed"
              accent="text-pink-400"
            />
          </div>

          {/* Bar chart — last 14 days */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
            <h2 className="text-[13px] font-semibold text-neutral-300 mb-4">Tasks Completed — Last 14 Days</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.perDay} barSize={18} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.perDay.map((entry, i) => {
                    const isToday = i === data.perDay.length - 1;
                    return (
                      <Cell
                        key={entry.day}
                        fill={isToday ? '#818cf8' : '#4338ca'}
                        opacity={isToday ? 1 : 0.7}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By assignee */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
            <h2 className="text-[13px] font-semibold text-neutral-300 mb-4">Completed by Assignee</h2>
            {data.byAssignee.length === 0 ? (
              <p className="text-neutral-600 text-sm">No data yet</p>
            ) : (
              <div className="space-y-3">
                {data.byAssignee.map(({ assignee, count }) => {
                  const pct = Math.round((count / data.totalAllTime) * 100);
                  const color = assigneeColor(assignee);
                  return (
                    <div key={assignee} className="flex items-center gap-3">
                      <span className="text-[12px] text-neutral-400 w-28 truncate capitalize">{assignee}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[12px] text-neutral-500 w-12 text-right">{count}</span>
                      <span className="text-[11px] text-neutral-600 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
