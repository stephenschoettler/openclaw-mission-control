'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
  created_at: string;
}

const COLUMNS = [
  { id: 'recurring', label: 'Recurring', dot: 'bg-purple-400', accent: 'col-accent-purple' },
  { id: 'backlog', label: 'Backlog', dot: 'bg-blue-400', accent: 'col-accent-blue' },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-yellow-400', accent: 'col-accent-yellow' },
  { id: 'review', label: 'Review', dot: 'bg-orange-400', accent: 'col-accent-orange' },
  { id: 'done', label: 'Done', dot: 'bg-green-400', accent: 'col-accent-green' },
];

const FILTER_TABS = ['All', 'Sir', 'Babbage'];

const ASSIGNEES = ['me', 'Sir', 'Babbage', 'Hustle', 'Code Monkey', 'Roadie', 'TLDR', 'Answring Ops'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const priorityConfig: Record<string, { color: string; border: string }> = {
  low: { color: 'text-neutral-400', border: 'border-l-neutral-500' },
  medium: { color: 'text-blue-400', border: 'border-l-blue-500' },
  high: { color: 'text-orange-400', border: 'border-l-orange-500' },
  urgent: { color: 'text-red-400', border: 'border-l-red-500' },
};

function parseUtc(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - parseUtc(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: '', description: '', assignee: 'me', priority: 'medium', status: 'backlog' });
  const [activeFilter, setActiveFilter] = useState('All');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    setTasks(await res.json());
    setLastUpdated(new Date());
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    const id = setInterval(fetchTasks, 15000);
    return () => clearInterval(id);
  }, [fetchTasks]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editingTask) {
      await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTask.id, ...form }) });
    } else {
      await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setForm({ title: '', description: '', assignee: 'me', priority: 'medium', status: 'backlog' });
    setShowForm(false);
    setEditingTask(null);
    fetchTasks();
  };

  const deleteTask = async (id: number) => {
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    fetchTasks();
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId) return;
    await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: parseInt(result.draggableId), status: destination.droppableId }) });
    fetchTasks();
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description, assignee: task.assignee, priority: task.priority, status: task.status });
    setShowForm(true);
  };

  const filteredTasks = activeFilter === 'All' ? tasks : tasks.filter(t => t.assignee === activeFilter);

  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const completion = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Tasks Board</h2>
          {lastUpdated && (
            <p className="text-[11px] text-neutral-600 mt-0.5">Updated {formatLastUpdated(lastUpdated)}</p>
          )}
        </div>
        <button onClick={() => { setEditingTask(null); setForm({ title: '', description: '', assignee: 'me', priority: 'medium', status: 'backlog' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/20">
          <Plus size={16} /> New task
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-white">{inProgress}</span>
          <span className="text-xs text-neutral-500">In progress</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-white">{tasks.length}</span>
          <span className="text-xs text-neutral-500">Total</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold ${completion >= 50 ? 'text-green-400' : 'text-white'}`}>{completion}%</span>
          <span className="text-xs text-neutral-500">Completion</span>
        </div>
      </div>

      {/* Assignee Filter Tabs */}
      <div className="flex items-center gap-1 mb-5">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === tab
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 p-4 card">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={2} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none transition-colors" />
            <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
              {ASSIGNEES.map(a => <option key={a} value={a} className="bg-neutral-900">{a}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
              {PRIORITIES.map(p => <option key={p} value={p} className="bg-neutral-900">{p}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
              {COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-neutral-900">{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">{editingTask ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditingTask(null); }} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))` }}>
          {COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className={`card p-4 min-h-[400px] flex flex-col`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h3 className="text-sm font-semibold text-neutral-300">{col.label}</h3>
                    <span className="text-[11px] text-neutral-600 bg-white/[0.06] px-1.5 py-0.5 rounded-full font-medium leading-none">{colTasks.length}</span>
                  </div>
                  <button
                    onClick={() => { setEditingTask(null); setForm({ title: '', description: '', assignee: 'me', priority: 'medium', status: col.id }); setShowForm(true); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.07] transition-all"
                    title={`Add to ${col.label}`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[280px] flex-1">
                      {colTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                            <div className={`w-2 h-2 rounded-full ${col.dot} opacity-40`} />
                          </div>
                          <p className="text-xs text-neutral-600">No tasks</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {colTasks.map((task, idx) => {
                            const pCfg = priorityConfig[task.priority] || priorityConfig.medium;
                            return (
                              <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 bg-white/[0.03] border border-white/[0.06] border-l-2 ${pCfg.border} rounded-lg group hover:border-white/[0.12] hover:bg-white/[0.04] transition-all`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <button onClick={() => startEdit(task)} className="text-sm font-medium text-white hover:text-indigo-400 text-left truncate block w-full transition-colors">{task.title}</button>
                                        {task.description && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{task.description}</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-white/[0.06] text-neutral-400 px-1.5 py-0.5 rounded font-medium">{task.assignee}</span>
                                        <span className={`text-[10px] font-semibold ${pCfg.color}`}>{task.priority}</span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteTask(task.id)} className="p-0.5 hover:text-red-400 text-neutral-600 transition-colors" title="Delete"><Trash2 size={14} /></button>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-neutral-600 mt-1.5">{timeAgo(task.created_at)}</p>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
