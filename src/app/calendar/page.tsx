'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface CalEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  notes: string;
}

interface CronJob {
  id: string;
  schedule: string;
  name?: string;
  label?: string;
  agent?: string;
  enabled?: boolean;
}

function parseCronNextDate(schedule: string, year: number, month: number): number[] {
  // Simple cron parser: extract day-of-month and day-of-week info
  const parts = schedule.split(/\s+/);
  if (parts.length < 5) return [];

  const [minute, hour, dayOfMonth, monthField, dayOfWeek] = parts;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];

  // Check if this month matches
  if (monthField !== '*' && !monthField.includes(String(month + 1))) {
    // Check for ranges/lists
    const monthNums = expandCronField(monthField, 1, 12);
    if (!monthNums.includes(month + 1)) return [];
  }

  if (dayOfMonth !== '*' && dayOfWeek === '*') {
    // Specific day of month
    const domNums = expandCronField(dayOfMonth, 1, daysInMonth);
    days.push(...domNums.filter(d => d <= daysInMonth));
  } else if (dayOfWeek !== '*' && dayOfMonth === '*') {
    // Specific day of week (0=Sun, 6=Sat)
    const dowNums = expandCronField(dayOfWeek, 0, 6);
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dowNums.includes(dow)) days.push(d);
    }
  } else if (dayOfMonth === '*' && dayOfWeek === '*') {
    // Every day
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
  }

  void minute; void hour; // Used for display only
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

  // Build cron schedule for this month
  const cronDays: Record<number, CronJob[]> = {};
  for (const cron of crons) {
    if (cron.enabled === false) continue;
    const days = parseCronNextDate(cron.schedule, year, month);
    for (const d of days) {
      if (!cronDays[d]) cronDays[d] = [];
      cronDays[d].push(cron);
    }
  }

  const monthStr = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Calendar</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> Add Event
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500" />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none [color-scheme:dark]" />
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none [color-scheme:dark]" />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" rows={2} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={addEvent} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm">Add</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-white/[0.06] rounded-lg text-neutral-400"><ChevronLeft size={20} /></button>
        <h3 className="text-lg font-semibold text-white">{monthStr}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-white/[0.06] rounded-lg text-neutral-400"><ChevronRight size={20} /></button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-neutral-500 border-b border-white/[0.06]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-[100px] p-2 border-b border-r border-white/[0.04]" />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const dayCrons = cronDays[day] || [];
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            return (
              <div key={day} className={`min-h-[100px] p-2 border-b border-r border-white/[0.04] ${isToday ? 'bg-indigo-500/5' : ''}`}>
                <span className={`text-xs font-medium ${isToday ? 'text-indigo-400 bg-indigo-500/20 w-6 h-6 flex items-center justify-center rounded-full' : 'text-neutral-400'}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayCrons.map(c => (
                    <div key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 truncate" title={c.name || c.label || c.id}>
                      {c.name || c.label || c.id}
                    </div>
                  ))}
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-300 truncate flex items-center gap-1 group">
                      <span className="truncate flex-1">{ev.time && `${ev.time} `}{ev.title}</span>
                      <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 size={10} /></button>
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
