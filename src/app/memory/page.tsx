'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Pin, FileText, X, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MemoryFile {
  filename: string;
  preview: string;
  size: number;
  mtime: string;
  pinned?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');

  const fetchFiles = useCallback(async () => {
    const res = await fetch('/api/memory');
    setFiles(await res.json());
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);
  useEffect(() => { const id = setInterval(fetchFiles, 30000); return () => clearInterval(id); }, [fetchFiles]);

  const openFile = async (filename: string) => {
    setSelectedFile(filename);
    const res = await fetch(`/api/memory?file=${encodeURIComponent(filename)}`);
    const data = await res.json();
    setFileContent(data.content || '');
  };

  const filtered = files.filter(f =>
    f.filename.toLowerCase().includes(search.toLowerCase()) ||
    f.preview.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter(f => f.pinned);
  const regular = filtered.filter(f => !f.pinned);

  return (
    <div className="flex gap-6 h-[calc(100vh-48px)]">
      {/* File list */}
      <div className="w-[360px] flex-shrink-0 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Brain size={16} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold gradient-text tracking-tight">Memory</h2>
            <span className="text-[10px] text-neutral-500 font-medium">{files.length} files</span>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memory..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-600 text-center py-8">No memory files found</p>
          ) : (
            <>
              {/* Pinned files */}
              {pinned.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider px-1 mb-2">Pinned</p>
                  {pinned.map(f => (
                    <FileCard key={f.filename} file={f} selected={selectedFile === f.filename} onClick={() => openFile(f.filename)} />
                  ))}
                </div>
              )}
              {/* Regular files */}
              {regular.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider px-1 mb-2">Files</p>
                  )}
                  {regular.map(f => (
                    <FileCard key={f.filename} file={f} selected={selectedFile === f.filename} onClick={() => openFile(f.filename)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content panel */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">{selectedFile}</h3>
              </div>
              <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-neutral-400 transition-colors"><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6 markdown-content">
              <ReactMarkdown>{fileContent}</ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
            <Brain size={32} className="mb-3 text-neutral-700" />
            <p className="text-sm">Select a file to view</p>
            <p className="text-xs text-neutral-700 mt-1">Memory files from your agent workspace</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FileCard({ file, selected, onClick }: { file: MemoryFile; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all mb-1 ${
        selected
          ? 'bg-indigo-500/10 border-indigo-500/30 glow-indigo'
          : 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-2">
        {file.pinned ? <Pin size={11} className="text-indigo-400" /> : <FileText size={11} className="text-neutral-600" />}
        <span className="text-xs font-semibold text-white truncate">{file.filename}</span>
      </div>
      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{file.preview}</p>
      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-600">
        <span>{formatSize(file.size)}</span>
        <span>{formatDate(file.mtime)}</span>
      </div>
    </button>
  );
}
