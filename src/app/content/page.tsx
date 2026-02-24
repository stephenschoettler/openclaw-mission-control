'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, Edit3 } from 'lucide-react';

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
  { id: 'idea', label: 'Idea', color: 'text-purple-400' },
  { id: 'scripted', label: 'Scripted', color: 'text-blue-400' },
  { id: 'thumbnail', label: 'Thumbnail', color: 'text-yellow-400' },
  { id: 'filming', label: 'Filming', color: 'text-orange-400' },
  { id: 'published', label: 'Published', color: 'text-green-400' },
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Content Pipeline</h2>
        <button onClick={() => { setEditingItem(null); setForm({ title: '', notes: '', script: '', thumbnail_url: '', stage: 'idea' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> Add Content
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Content title" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500" />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none" />
            <textarea value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} placeholder="Script" rows={3} className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 resize-none" />
            <input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="Thumbnail URL (optional)" className="col-span-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm">{editingItem ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Pipeline Columns */}
      <div className="grid grid-cols-5 gap-3">
        {STAGES.map(stage => {
          const stageItems = items.filter(i => i.stage === stage.id);
          return (
            <div key={stage.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-semibold ${stage.color}`}>{stage.label}</h3>
                <span className="text-[10px] text-neutral-500 bg-white/[0.04] px-1.5 py-0.5 rounded-full">{stageItems.length}</span>
              </div>
              {stageItems.length === 0 ? (
                <p className="text-[10px] text-neutral-600 text-center py-6">Empty</p>
              ) : (
                <div className="space-y-2">
                  {stageItems.map(item => (
                    <div key={item.id} className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg group hover:border-white/[0.12] transition-colors">
                      <button onClick={() => startEdit(item)} className="text-xs font-medium text-white hover:text-indigo-400 text-left truncate block w-full">
                        {item.title}
                      </button>
                      {item.notes && <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2">{item.notes}</p>}
                      <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveItem(item, 'left')} className="p-0.5 hover:text-white text-neutral-500"><ChevronLeft size={12} /></button>
                          <button onClick={() => moveItem(item, 'right')} className="p-0.5 hover:text-white text-neutral-500"><ChevronRight size={12} /></button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(item)} className="p-0.5 hover:text-indigo-400 text-neutral-500"><Edit3 size={12} /></button>
                          <button onClick={() => deleteItem(item.id)} className="p-0.5 hover:text-red-400 text-neutral-500"><Trash2 size={12} /></button>
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
