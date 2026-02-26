'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
  rejection_count: number;
  created_at: string;
  updated_at: string;
}

const ASSIGNEES = ['me', 'Sir', 'Babbage', 'Hustle', 'Code Monkey', 'Roadie', 'TLDR', 'Answring Ops', 'Ralph'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ALL_STATUSES = ['backlog', 'recurring', 'in-progress', 'review', 'done'];

const priorityConfig: Record<string, { color: string; border: string }> = {
  low:    { color: 'text-neutral-400', border: 'border-l-neutral-500' },
  medium: { color: 'text-blue-400',    border: 'border-l-blue-500'    },
  high:   { color: 'text-orange-400',  border: 'border-l-orange-500'  },
  urgent: { color: 'text-red-400',     border: 'border-l-red-500'     },
};

// Assignee → short pill color
const assigneeColor = (a: string): string => {
  const map: Record<string, string> = {
    babbage:     'bg-violet-500/20 text-violet-300',
    'code monkey': 'bg-blue-500/20 text-blue-300',
    'code-monkey': 'bg-blue-500/20 text-blue-300',
    ralph:       'bg-emerald-500/20 text-emerald-300',
    hustle:      'bg-pink-500/20 text-pink-300',
    roadie:      'bg-amber-500/20 text-amber-300',
    tldr:        'bg-cyan-500/20 text-cyan-300',
    sir:         'bg-indigo-500/20 text-indigo-300',
    me:          'bg-indigo-500/20 text-indigo-300',
  };
  return map[a.toLowerCase()] ?? 'bg-white/[0.08] text-neutral-400';
};

function parseUtc(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - parseUtc(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isStale(task: Task): boolean {
  if (task.status !== 'in-progress') return false;
  const updated = parseUtc(task.updated_at || task.created_at);
  return (Date.now() - updated.getTime()) / 3600000 > 24;
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  showStatusBadge,
  dragHandleProps,
  isDragging,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: number) => void;
  showStatusBadge?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: any;
  isDragging?: boolean;
}) {
  const pCfg = priorityConfig[task.priority] || priorityConfig.medium;
  const stale = isStale(task);
  const isReview = task.status === 'review';
  const isInProgress = task.status === 'in-progress';
  const isRecurring = task.status === 'recurring';

  return (
    <div
      {...dragHandleProps}
      className={`p-3 bg-white/[0.03] border border-white/[0.06] border-l-2 ${pCfg.border} rounded-lg group
        hover:border-white/[0.12] hover:bg-white/[0.05] transition-all
        ${stale ? 'opacity-60' : ''}
        ${isDragging ? 'shadow-xl shadow-black/50 rotate-1 opacity-90 scale-[1.02]' : ''}
        cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {isRecurring && <span className="text-purple-400 text-[11px]" title="Recurring">🔁</span>}
            {showStatusBadge && isReview && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">REVIEW</span>
            )}
            {showStatusBadge && isInProgress && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex-shrink-0">ACTIVE</span>
            )}
            <button
              onClick={() => onEdit(task)}
              className="text-sm font-medium text-white hover:text-indigo-400 text-left truncate transition-colors"
            >
              {task.title}
            </button>
            {task.rejection_count > 0 && (
              <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-red-400" title={`Rejected ${task.rejection_count}×`}>
                🔴<span>×{task.rejection_count}</span>
              </span>
            )}
            {stale && <span className="text-[9px] text-orange-400/70 flex-shrink-0">stale</span>}
          </div>
          {task.description && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="p-0.5 hover:text-red-400 text-neutral-700 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Assignee pill */}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${assigneeColor(task.assignee)}`}>
            {task.assignee}
          </span>
          <span className={`text-[10px] font-semibold ${pCfg.color}`}>{task.priority}</span>
        </div>
        <span className="text-[10px] text-neutral-600 flex-shrink-0">{timeAgo(task.created_at)}</span>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: '', description: '', assignee: 'me', priority: 'medium', status: 'backlog' });
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

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description, assignee: task.assignee, priority: task.priority, status: task.status });
    setShowForm(true);
  };

  const openNew = (status = 'backlog') => {
    setEditingTask(null);
    setForm({ title: '', description: '', assignee: 'me', priority: 'medium', status });
    setShowForm(true);
  };

  // Drag-and-drop
  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const taskId = parseInt(draggableId, 10);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const destId = destination.droppableId; // "queue" | "active" | "done"
    const newStatus =
      destId === 'queue'  ? 'backlog'     :
      destId === 'active' ? 'in-progress' :
      'done';

    if (newStatus === task.status) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });

    fetchTasks();
  }, [tasks, fetchTasks]);

  // Partitions
  const queueTasks = tasks.filter(t => t.status === 'backlog' || t.status === 'recurring');
  const activeTasks = tasks.filter(t => t.status === 'in-progress' || t.status === 'review');
  const doneTasks = [...tasks]
    .filter(t => t.status === 'done')
    .sort((a, b) => parseUtc(b.updated_at || b.created_at).getTime() - parseUtc(a.updated_at || a.created_at).getTime())
    .slice(0, 10);

  // Stats
  const completion = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Tasks Board</h2>
            {lastUpdated && (
              <p className="text-[11px] text-neutral-600 mt-0.5">Updated {formatLastUpdated(lastUpdated)}</p>
            )}
          </div>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          >
            <Plus size={16} /> New task
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-4 px-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">{activeTasks.length}</span>
            <span className="text-xs text-neutral-500">Active</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">{queueTasks.length}</span>
            <span className="text-xs text-neutral-500">Queued</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">{tasks.length}</span>
            <span className="text-xs text-neutral-500">Total</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-bold ${completion >= 50 ? 'text-green-400' : 'text-white'}`}>{completion}%</span>
            <span className="text-xs text-neutral-500">Done</span>
          </div>
          <button onClick={fetchTasks} className="ml-auto p-1.5 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] transition-all" title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Edit / Add Form */}
        {showForm && (
          <div className="mb-5 p-4 card">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Task title"
                className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors"
              />
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none transition-colors"
              />
              <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
                {ASSIGNEES.map(a => <option key={a} value={a} className="bg-neutral-900">{a}</option>)}
              </select>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
                {PRIORITIES.map(p => <option key={p} value={p} className="bg-neutral-900">{p}</option>)}
              </select>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
                {ALL_STATUSES.map(s => <option key={s} value={s} className="bg-neutral-900">{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">
                {editingTask ? 'Update' : 'Create'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingTask(null); }} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Board */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

          {/* Left: Queue + Active stacked */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">

            {/* QUEUE panel */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Queue</h3>
                  <span className="text-[10px] text-neutral-600">backlog · recurring</span>
                  {queueTasks.length > 0 && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">{queueTasks.length}</span>
                  )}
                </div>
                <button
                  onClick={() => openNew('backlog')}
                  className="w-6 h-6 rounded flex items-center justify-center text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.06] transition-all"
                  title="Add to queue"
                >
                  <Plus size={13} />
                </button>
              </div>

              <Droppable droppableId="queue">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[56px] rounded-lg p-1 -m-1 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''}`}
                  >
                    {queueTasks.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="flex items-center gap-1.5 py-3 px-2 rounded-lg bg-white/[0.02] border border-dashed border-white/[0.06]">
                        <span className="text-[11px] text-green-500/60">Queue clear ✓</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {queueTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                                <TaskCard
                                  task={task}
                                  onEdit={startEdit}
                                  onDelete={deleteTask}
                                  dragHandleProps={dragProvided.dragHandleProps}
                                  isDragging={dragSnapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* ACTIVE panel */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Active</h3>
                <span className="text-[10px] text-neutral-600">in-progress · review</span>
                {activeTasks.length > 0 && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-medium">{activeTasks.length}</span>
                )}
              </div>

              <Droppable droppableId="active">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[56px] rounded-lg p-1 -m-1 transition-colors ${snapshot.isDraggingOver ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30' : ''}`}
                  >
                    {activeTasks.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="flex items-center gap-1.5 py-3 px-2 rounded-lg bg-white/[0.02] border border-dashed border-white/[0.06]">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                        <span className="text-[11px] text-green-500/60">Nothing active</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                                <TaskCard
                                  task={task}
                                  onEdit={startEdit}
                                  onDelete={deleteTask}
                                  showStatusBadge
                                  dragHandleProps={dragProvided.dragHandleProps}
                                  isDragging={dragSnapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

          </div>

          {/* RIGHT — Done column */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="card p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Done</h3>
                {doneTasks.length > 0 && (
                  <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full font-medium">{doneTasks.length}</span>
                )}
              </div>

              <Droppable droppableId="done">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[60px] rounded-lg transition-colors overflow-y-auto ${snapshot.isDraggingOver ? 'bg-green-500/10 ring-1 ring-green-500/30' : ''}`}
                  >
                    {doneTasks.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="flex flex-col items-center justify-center h-full gap-1">
                        <span className="text-[11px] text-neutral-600">Nothing done yet</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {doneTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-lg group cursor-grab active:cursor-grabbing hover:bg-white/[0.04] transition-all ${dragSnapshot.isDragging ? 'shadow-lg shadow-black/40 rotate-1 opacity-90' : ''}`}
                                onClick={() => startEdit(task)}
                              >
                                <div className="flex items-start gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500/60 mt-1 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-neutral-300 line-clamp-2 leading-snug">{task.title}</p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full ${assigneeColor(task.assignee)}`}>{task.assignee}</span>
                                      {task.rejection_count > 0 && (
                                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400" title={`Rejected ${task.rejection_count}×`}>🔴×{task.rejection_count}</span>
                                      )}
                                      <span className="text-[10px] text-neutral-600">{timeAgo(task.updated_at || task.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

        </div>
      </div>
    </DragDropContext>
  );
}
