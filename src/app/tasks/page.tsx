'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, GripVertical } from 'lucide-react';

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
  { id: 'backlog', label: 'Backlog' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const ASSIGNEES = ['me', 'Babbage', 'Hustle', 'Code Monkey', 'Roadie', 'TLDR', 'Answring Ops'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const priorityColor: Record<string, string> = {
  low: 'text-neutral-400',
  medium: 'text-blue-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: '', description: '', assignee: 'me', priority: 'medium', status: 'backlog' });

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    setTasks(await res.json());
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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

  const moveTask = async (task: Task, direction: 'left' | 'right') => {
    const idx = COLUMNS.findIndex(c => c.id === task.status);
    const newIdx = direction === 'right' ? Math.min(idx + 1, COLUMNS.length - 1) : Math.max(idx - 1, 0);
    if (idx === newIdx) return;
    await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: COLUMNS[newIdx].id }) });
    fetchTasks();
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description, assignee: task.assignee, priority: task.priority, status: task.status });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Tasks Board</h2>
        <button onClick={() => { setEditingTask(null); setForm({ title: '', description: '', assignee: 'me', priority: 'medium', status: 'backlog' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={2} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none" />
            <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
              {ASSIGNEES.map(a => <option key={a} value={a} className="bg-neutral-900">{a}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white outline-none">
              {PRIORITIES.map(p => <option key={p} value={p} className="bg-neutral-900">{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm">{editingTask ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditingTask(null); }} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-neutral-300">{col.label}</h3>
                <span className="text-xs text-neutral-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              {colTasks.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-8">No tasks in {col.label.toLowerCase()}</p>
              ) : (
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div key={task.id} className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg group hover:border-white/[0.12] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <button onClick={() => startEdit(task)} className="text-sm font-medium text-white hover:text-indigo-400 text-left truncate block w-full">{task.title}</button>
                          {task.description && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{task.description}</p>}
                        </div>
                        <GripVertical size={14} className="text-neutral-600 mt-0.5 flex-shrink-0" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-white/[0.06] text-neutral-400 px-1.5 py-0.5 rounded">{task.assignee}</span>
                          <span className={`text-[10px] font-medium ${priorityColor[task.priority]}`}>{task.priority}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveTask(task, 'left')} className="p-0.5 hover:text-white text-neutral-500" title="Move left"><ChevronLeft size={14} /></button>
                          <button onClick={() => moveTask(task, 'right')} className="p-0.5 hover:text-white text-neutral-500" title="Move right"><ChevronRight size={14} /></button>
                          <button onClick={() => deleteTask(task.id)} className="p-0.5 hover:text-red-400 text-neutral-500" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
