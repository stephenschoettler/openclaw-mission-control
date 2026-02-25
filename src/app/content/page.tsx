'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, Edit3, Lightbulb, FileText, Image, Video, CheckCircle2 } from 'lucide-react';

interface ContentItem {
  id: number;
  title: string;
  notes: string;
  script: string;
  thumbnail_url: string;
  stage: string;
  created_at: string;
}

const STAGES = [
  { id: 'idea', label: 'Ideas', color: 'text-purple-400', icon: Lightbulb, accent: 'col-accent-purple', dotColor: 'bg-purple-400' },
  { id: 'scripted', label: 'Scripting', color: 'text-blue-400', icon: FileText, accent: 'col-accent-blue', dotColor: 'bg-blue-400' },
  { id: 'thumbnail', label: 'Thumbnail', color: 'text-yellow-400', icon: Image, accent: 'col-accent-yellow', dotColor: 'bg-yellow-400' },
  { id: 'filming', label: 'Filming', color: 'text-orange-400', icon: Video, accent: 'col-accent-orange', dotColor: 'bg-orange-400' },
  { id: 'published', label: 'Published', color: 'text-green-400', icon: CheckCircle2, accent: 'col-accent-green', dotColor: 'bg-green-400' },
];

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [form, setForm] = useState({ title: '', notes: '', script: '', thumbnail_url: '', stage: 'idea' });

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/content');
    setItems(await res.json());
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editingItem) {
      await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingItem.id, ...form }) });
    } else {
      await fetch('/api/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setForm({ title: '', notes: '', script: '', thumbnail_url: '', stage: 'idea' });
    setShowForm(false);
    setEditingItem(null);
    fetchItems();
  };

  const deleteItem = async (id: number) => {
    await fetch(`/api/content?id=${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const moveItem = async (item: ContentItem, direction: 'left' | 'right') => {
    const idx = STAGES.findIndex(s => s.id === item.stage);
    const newIdx = direction === 'right' ? Math.min(idx + 1, STAGES.length - 1) : Math.max(idx - 1, 0);
    if (idx === newIdx) return;
    await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, stage: STAGES[newIdx].id }) });
    fetchItems();
  };

  const startEdit = (item: ContentItem) => {
    setEditingItem(item);
    setForm({ title: item.title, notes: item.notes, script: item.script, thumbnail_url: item.thumbnail_url, stage: item.stage });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Content Pipeline</h2>
          <p className="text-xs text-neutral-500 mt-1">Ideas → Scripts → Thumbnails → Published</p>
        </div>
        <button onClick={() => { setEditingItem(null); setForm({ title: '', notes: '', script: '', thumbnail_url: '', stage: 'idea' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/20">
          <Plus size={16} /> Add Content
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {STAGES.map(stage => {
          const Icon = stage.icon;
          const count = items.filter(i => i.stage === stage.id).length;
          return (
            <div key={stage.id} className="card p-3">
              <div className="flex items-center gap-2">
                <Icon size={14} className={stage.color} />
                <span className={`text-[11px] font-semibold ${stage.color}`}>{stage.label}</span>
              </div>
              <p className="text-lg font-bold text-white mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="mb-5 p-4 card">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Content title" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors" />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none transition-colors" />
            <textarea value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} placeholder="Script" rows={3} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none transition-colors" />
            <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="Thumbnail URL (optional)" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">{editingItem ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Pipeline Columns */}
      <div className="grid grid-cols-5 gap-3">
        {STAGES.map(stage => {
          const stageItems = items.filter(i => i.stage === stage.id);
          const Icon = stage.icon;
          return (
            <div key={stage.id} className={`card p-3 ${stage.accent}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={13} className={stage.color} />
                  <h3 className={`text-xs font-semibold ${stage.color}`}>{stage.label}</h3>
                </div>
                <span className="text-[10px] text-neutral-500 bg-white/[0.06] px-1.5 py-0.5 rounded-full font-medium">{stageItems.length}</span>
              </div>
              {stageItems.length === 0 ? (
                <p className="text-[10px] text-neutral-600 text-center py-6">No items</p>
              ) : (
                <div className="space-y-2">
                  {stageItems.map(item => (
                    <div key={item.id} className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg group hover:border-white/[0.12] hover:bg-white/[0.04] transition-all">
                      <button onClick={() => startEdit(item)} className="text-xs font-medium text-white hover:text-indigo-400 text-left truncate block w-full transition-colors">
                        {item.title}
                      </button>
                      {item.notes && <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2">{item.notes}</p>}
                      <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveItem(item, 'left')} className="p-0.5 hover:text-white text-neutral-600 transition-colors"><ChevronLeft size={12} /></button>
                          <button onClick={() => moveItem(item, 'right')} className="p-0.5 hover:text-white text-neutral-600 transition-colors"><ChevronRight size={12} /></button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(item)} className="p-0.5 hover:text-indigo-400 text-neutral-600 transition-colors"><Edit3 size={12} /></button>
                          <button onClick={() => deleteItem(item.id)} className="p-0.5 hover:text-red-400 text-neutral-600 transition-colors"><Trash2 size={12} /></button>
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
