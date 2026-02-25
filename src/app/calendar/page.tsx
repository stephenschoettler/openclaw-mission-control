'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Zap } from 'lucide-react';

interface CalEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  notes: string;
}

interface CronJob {
  id: string;
  schedule: string | { kind: string; expr: string; tz?: string };
  name?: string;
  label?: string;
  agentId?: string;
  agent?: string;
  enabled?: boolean;
  payload?: { message?: string };
}

function parseCronNextDate(schedule: string, year: number, month: number): number[] {
  const parts = schedule.split(/\s+/);
  if (parts.length < 5) return [];

  const [minute, hour, dayOfMonth, monthField, dayOfWeek] = parts;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];

  if (monthField !== '*' && !monthField.includes(String(month + 1))) {
    const monthNums = expandCronField(monthField, 1, 12);
    if (!monthNums.includes(month + 1)) return [];
  }

  if (dayOfMonth !== '*' && dayOfWeek === '*') {
    const domNums = expandCronField(dayOfMonth, 1, daysInMonth);
    days.push(...domNums.filter(d => d <= daysInMonth));
  } else if (dayOfWeek !== '*' && dayOfMonth === '*') {
    const dowNums = expandCronField(dayOfWeek, 0, 6);
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dowNums.includes(dow)) days.push(d);
    }
  } else if (dayOfMonth === '*' && dayOfWeek === '*') {
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
  }

  void minute; void hour;
  return days;
}

function expandCronField(field: string, min: number, max: number): number[] {
  const result: number[] = [];
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const s = parseInt(step);
      const start = range === '*' ? min : parseInt(range);
      for (let i = start; i <= max; i += s) result.push(i);
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= b; i++) result.push(i);
    } else if (part === '*') {
      for (let i = min; i <= max; i++) result.push(i);
    } else {
      result.push(parseInt(part));
    }
  }
  return result;
}

const CRON_COLORS = [
  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
  { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', notes: '' });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = useCallback(async () => {
    const [evRes, crRes] = await Promise.all([fetch('/api/events'), fetch('/api/crons')]);
    setEvents(await evRes.json());
    setCrons(await crRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, [fetchData]);

  const addEvent = async () => {
    if (!form.title.trim() || !form.date) return;
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ title: '', date: '', time: '', notes: '' });
    setShowForm(false);
    fetchData();
  };

  const deleteEvent = async (id: number) => {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const today = new Date();

  const activeCrons = crons.filter(c => c.enabled !== false);

  // Build cron schedule for this month
  const cronDays: Record<number, CronJob[]> = {};
  for (const cron of activeCrons) {
    const scheduleExpr = typeof cron.schedule === 'string' ? cron.schedule : cron.schedule?.expr ?? '';
    const days = parseCronNextDate(scheduleExpr, year, month);
    for (const d of days) {
      if (!cronDays[d]) cronDays[d] = [];
      cronDays[d].push(cron);
    }
  }

  // Assign stable colors to cron jobs
  const cronColorMap = new Map<string, typeof CRON_COLORS[0]>();
  activeCrons.forEach((c, i) => cronColorMap.set(c.id, CRON_COLORS[i % CRON_COLORS.length]));

  const monthStr = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Calendar</h2>
          <p className="text-xs text-neutral-500 mt-1">Scheduled tasks & events</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/20">
          <Plus size={16} /> Add Event
        </button>
      </div>

      {/* Always Running crons */}
      {activeCrons.length > 0 && (
        <div className="card p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-neutral-300">Always Running</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeCrons.map(c => {
              const scheduleExpr = typeof c.schedule === 'string' ? c.schedule : c.schedule?.expr ?? '';
              const color = cronColorMap.get(c.id) || CRON_COLORS[0];
              return (
                <span key={c.id} className={`text-[11px] px-2.5 py-1 rounded-full ${color.bg} ${color.text} border ${color.border} font-medium`}>
                  {c.name || c.label || c.id} · {scheduleExpr}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-5 p-4 card">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors" />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none [color-scheme:dark]" />
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none [color-scheme:dark]" />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" rows={2} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none transition-colors" />
          </div>
          <div className="flex gap-2">
            <button onClick={addEvent} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">Add</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-white/[0.06] rounded-lg text-neutral-400 transition-colors"><ChevronLeft size={20} /></button>
        <h3 className="text-lg font-bold text-white">{monthStr}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-white/[0.06] rounded-lg text-neutral-400 transition-colors"><ChevronRight size={20} /></button>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2.5 text-center text-[11px] font-semibold text-neutral-500 border-b border-white/[0.06] uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-[100px] p-2 border-b border-r border-white/[0.04]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const dayCrons = cronDays[day] || [];
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            return (
              <div key={day} className={`min-h-[100px] p-2 border-b border-r border-white/[0.04] transition-colors ${isToday ? 'bg-indigo-500/[0.07]' : 'hover:bg-white/[0.02]'}`}>
                <span className={`text-xs font-semibold inline-flex items-center justify-center ${isToday ? 'text-white bg-indigo-500 w-6 h-6 rounded-full' : 'text-neutral-500'}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayCrons.map(c => {
                    const color = cronColorMap.get(c.id) || CRON_COLORS[0];
                    return (
                      <div key={c.id} className={`text-[9px] px-1.5 py-0.5 rounded ${color.bg} ${color.text} truncate font-medium`} title={c.name || c.label || c.id}>
                        {c.name || c.label || c.id}
                      </div>
                    );
                  })}
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 truncate flex items-center gap-1 group border border-green-500/20">
                      <span className="truncate flex-1">{ev.time && `${ev.time} `}{ev.title}</span>
                      <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"><Trash2 size={9} /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
