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

const FILTER_TABS = ['All', 'Sir', 'Babbage'];

const ALWAYS_AGENTS = [
  { id: 'babbage', label: 'Babbage', match: (a: string) => a.toLowerCase() === 'babbage' },
  { id: 'code-monkey', label: 'Code Monkey', match: (a: string) => a.toLowerCase() === 'code monkey' || a.toLowerCase() === 'code-monkey' },
  { id: 'ralph', label: 'Ralph', match: (a: string) => a.toLowerCase() === 'ralph' },
];

const OTHER_AGENT_DEFS = [
  { id: 'hustle', label: 'Hustle', match: (a: string) => a.toLowerCase() === 'hustle' },
  { id: 'answring', label: 'Answring', match: (a: string) => a.toLowerCase().startsWith('answring') },
  { id: 'roadie', label: 'Roadie', match: (a: string) => a.toLowerCase() === 'roadie' },
  { id: 'tldr', label: 'TLDR', match: (a: string) => a.toLowerCase() === 'tldr' },
];

const ALL_AGENT_DEFS = [...ALWAYS_AGENTS, ...OTHER_AGENT_DEFS];

// Map agent column IDs to canonical assignee strings used when reassigning
const AGENT_ASSIGNEE_MAP: Record<string, string> = {
  'babbage': 'Babbage',
  'code-monkey': 'Code Monkey',
  'ralph': 'Ralph',
  'hustle': 'Hustle',
  'answring': 'Answring Ops',
  'roadie': 'Roadie',
  'tldr': 'TLDR',
};

const ASSIGNEES = ['me', 'Sir', 'Babbage', 'Hustle', 'Code Monkey', 'Roadie', 'TLDR', 'Answring Ops', 'Ralph'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ALL_STATUSES = ['backlog', 'recurring', 'in-progress', 'review', 'done'];

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

/** If a task has been in-progress for >24h, it's stale */
function resolveStatus(task: Task): { stale: boolean } {
  if (task.status === 'in-progress') {
    const updated = parseUtc(task.updated_at || task.created_at);
    const hoursAgo = (Date.now() - updated.getTime()) / 3600000;
    return { stale: hoursAgo > 24 };
  }
  return { stale: false };
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
  const { stale } = resolveStatus(task);
  const isRecurring = task.status === 'recurring';
  const isReview = task.status === 'review';
  const isInProgress = task.status === 'in-progress';

  return (
    <div
      {...dragHandleProps}
      className={`p-3 bg-white/[0.03] border border-white/[0.06] border-l-2 ${pCfg.border} rounded-lg group hover:border-white/[0.12] hover:bg-white/[0.05] transition-all ${stale ? 'opacity-60' : ''} ${isDragging ? 'shadow-lg shadow-black/40 rotate-1 opacity-90' : ''} cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {isRecurring && <span title="Recurring" className="text-purple-400 text-[11px]">🔁</span>}
            {isReview && showStatusBadge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">REVIEW</span>
            )}
            {isInProgress && showStatusBadge && (
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
          {task.description && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{task.description}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold ${pCfg.color}`}>{task.priority}</span>
          <span className="text-[10px] text-neutral-600">{timeAgo(task.created_at)}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="p-0.5 hover:text-red-400 text-neutral-700 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
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

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description, assignee: task.assignee, priority: task.priority, status: task.status });
    setShowForm(true);
  };

  // Drag-and-drop handler
  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const taskId = parseInt(draggableId, 10);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // droppableId format: "queue|agentId", "active|agentId", "done"
    const [destPanel, destAgentId] = destination.droppableId.split('|');

    let newStatus: string;
    if (destPanel === 'queue') newStatus = 'backlog';
    else if (destPanel === 'active') newStatus = 'in-progress';
    else newStatus = 'done';

    // Determine new assignee: if agentId present and known, remap; otherwise keep existing
    let newAssignee = task.assignee;
    if (destAgentId && destAgentId !== 'unknown' && AGENT_ASSIGNEE_MAP[destAgentId]) {
      newAssignee = AGENT_ASSIGNEE_MAP[destAgentId];
    }

    // No-op if nothing changed
    if (newStatus === task.status && newAssignee === task.assignee) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, assignee: newAssignee } : t));

    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status: newStatus, assignee: newAssignee }),
    });

    // Refresh in background
    fetchTasks();
  }, [tasks, fetchTasks]);

  // Filter tasks by assignee tab
  const filteredTasks = activeFilter === 'All'
    ? tasks
    : tasks.filter(t => t.assignee.toLowerCase() === activeFilter.toLowerCase());

  // Stats
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const completion = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  // Figure out which "other" agents have tasks to show
  const otherAgentsWithTasks = OTHER_AGENT_DEFS.filter(agent =>
    filteredTasks.some(t => agent.match(t.assignee))
  );
  const visibleAgents = [...ALWAYS_AGENTS, ...otherAgentsWithTasks];

  // Partition tasks
  const queueTasks = (agentDef: typeof ALWAYS_AGENTS[0]) =>
    filteredTasks.filter(t => agentDef.match(t.assignee) && (t.status === 'backlog' || t.status === 'recurring'));

  const activeTasks = (agentDef: typeof ALWAYS_AGENTS[0]) =>
    filteredTasks.filter(t => agentDef.match(t.assignee) && (t.status === 'in-progress' || t.status === 'review'));

  const doneTasks = [...filteredTasks]
    .filter(t => t.status === 'done')
    .sort((a, b) => parseUtc(b.updated_at || b.created_at).getTime() - parseUtc(a.updated_at || a.created_at).getTime())
    .slice(0, 10);

  // Unknown agent tasks (not matched by any agent def) — dump into a misc column
  const knownAssignees = (t: Task) => ALL_AGENT_DEFS.some(a => a.match(t.assignee));
  const unknownQueue = filteredTasks.filter(t => !knownAssignees(t) && (t.status === 'backlog' || t.status === 'recurring'));
  const unknownActive = filteredTasks.filter(t => !knownAssignees(t) && (t.status === 'in-progress' || t.status === 'review'));
  const hasUnknown = unknownQueue.length > 0 || unknownActive.length > 0;

  const openNew = (status = 'backlog') => {
    setEditingTask(null);
    setForm({ title: '', description: '', assignee: 'me', priority: 'medium', status });
    setShowForm(true);
  };

  const gridCols = visibleAgents.length + (hasUnknown ? 1 : 0);

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
          <button onClick={fetchTasks} className="ml-auto p-1.5 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.05] transition-all" title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-4">
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

        {/* Two-panel + Done layout */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: agent columns grid */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* TOP PANEL — Queues */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Queues</h3>
                <span className="text-[10px] text-neutral-600">backlog · recurring</span>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {visibleAgents.map(agent => {
                  const agentQueue = queueTasks(agent);
                  const droppableId = `queue|${agent.id}`;
                  return (
                    <div key={agent.id} className="flex flex-col min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-neutral-300">{agent.label}</span>
                          {agentQueue.length > 0 && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">{agentQueue.length}</span>
                          )}
                        </div>
                        <button
                          onClick={() => openNew('backlog')}
                          className="w-5 h-5 rounded flex items-center justify-center text-neutral-700 hover:text-neutral-400 hover:bg-white/[0.06] transition-all"
                          title="Add to queue"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <Droppable droppableId={droppableId}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[48px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-blue-500/10 border border-blue-500/30' : ''}`}
                          >
                            {agentQueue.length === 0 && !snapshot.isDraggingOver ? (
                              <div className="flex items-center gap-1.5 py-3 px-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <span className="text-[11px] text-green-500/70">Queue clear ✓</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {agentQueue.map((task, index) => (
                                  <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                    {(dragProvided, dragSnapshot) => (
                                      <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                      >
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
                  );
                })}
                {hasUnknown && (
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-neutral-400">Other</span>
                      {unknownQueue.length > 0 && (
                        <span className="text-[10px] bg-white/[0.08] text-neutral-400 px-1.5 py-0.5 rounded-full">{unknownQueue.length}</span>
                      )}
                    </div>
                    <Droppable droppableId="queue|unknown">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[48px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-blue-500/10 border border-blue-500/30' : ''}`}
                        >
                          {unknownQueue.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="flex items-center gap-1.5 py-3 px-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <span className="text-[11px] text-green-500/70">Queue clear ✓</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {unknownQueue.map((task, index) => (
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
                )}
              </div>
            </div>

            {/* BOTTOM PANEL — Active */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Active</h3>
                <span className="text-[10px] text-neutral-600">in-progress · review</span>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {visibleAgents.map(agent => {
                  const agentActive = activeTasks(agent);
                  const isFree = agentActive.length === 0;
                  const droppableId = `active|${agent.id}`;
                  return (
                    <div key={agent.id} className="flex flex-col min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-neutral-300">{agent.label}</span>
                          {agentActive.length > 0 && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-medium">{agentActive.length}</span>
                          )}
                        </div>
                      </div>
                      <Droppable droppableId={droppableId}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[48px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-yellow-500/10 border border-yellow-500/30' : ''}`}
                          >
                            {isFree && !snapshot.isDraggingOver ? (
                              <div className="flex items-center gap-1.5 py-3 px-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                                <span className="text-[11px] text-green-500/70">Free</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {agentActive.map((task, index) => (
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
                  );
                })}
                {hasUnknown && (
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-neutral-400">Other</span>
                      {unknownActive.length > 0 && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full">{unknownActive.length}</span>
                      )}
                    </div>
                    <Droppable droppableId="active|unknown">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[48px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-yellow-500/10 border border-yellow-500/30' : ''}`}
                        >
                          {unknownActive.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="flex items-center gap-1.5 py-3 px-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                              <span className="text-[11px] text-green-500/70">Free</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {unknownActive.map((task, index) => (
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
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Done column */}
          <div className="w-56 flex-shrink-0">
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
                    className={`flex-1 min-h-[60px] rounded-lg transition-colors overflow-y-auto ${snapshot.isDraggingOver ? 'bg-green-500/10 border border-green-500/30' : ''}`}
                  >
                    {doneTasks.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2">
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
                                    <p className="text-xs text-neutral-400 line-clamp-2 leading-snug">{task.title}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[10px] text-neutral-600">{task.assignee}</span>
                                      <span className="text-[10px] text-neutral-700">·</span>
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
