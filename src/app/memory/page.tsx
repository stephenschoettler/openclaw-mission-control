'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Pin, FileText, X } from 'lucide-react';
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

  return (
    <div className="flex gap-6 h-[calc(100vh-48px)]">
      {/* File list */}
      <div className="w-[400px] flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Memory</h2>
          <span className="text-xs text-neutral-500">{files.length} files</span>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-auto space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-600 text-center py-8">No memory files found</p>
          ) : (
            filtered.map(f => (
              <button
                key={f.filename}
                onClick={() => openFile(f.filename)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedFile === f.filename
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {f.pinned ? <Pin size={12} className="text-indigo-400" /> : <FileText size={12} className="text-neutral-500" />}
                  <span className="text-sm font-medium text-white truncate">{f.filename}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{f.preview}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-600">
                  <span>{formatSize(f.size)}</span>
                  <span>{new Date(f.mtime).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Content panel */}
      <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">{selectedFile}</h3>
              <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-white/[0.06] rounded text-neutral-400"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6 markdown-content">
              <ReactMarkdown>{fileContent}</ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
}
