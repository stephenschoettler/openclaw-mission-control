'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, File, FileText, Trash2, Upload, ChevronRight, X, Edit3, Eye, Folder, Code, FileJson, FileType, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const HOME = '/home/w0lf';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  modified: string;
  ext: string;
}

interface Workspace {
  path: string;
  label: string;
}

const WORKSPACES: Workspace[] = [
  { path: `${HOME}/.openclaw/memory`, label: 'Memory' },
  { path: `${HOME}/.openclaw/cron`, label: 'Cron Jobs' },
  { path: `${HOME}/.openclaw/workspace`, label: 'Main' },
  { path: `${HOME}/.openclaw/workspace-main`, label: 'Main (alt)' },
  { path: `${HOME}/.openclaw/workspace-dev`, label: 'Code Monkey' },
  { path: `${HOME}/.openclaw/workspace-dev-backend`, label: 'Code Backend' },
  { path: `${HOME}/.openclaw/workspace-dev-devops`, label: 'Code DevOps' },
  { path: `${HOME}/.openclaw/workspace-dev-frontend`, label: 'Code Frontend' },
  { path: `${HOME}/.openclaw/workspace-ralph`, label: 'Ralph' },
  { path: `${HOME}/.openclaw/workspace-comms`, label: 'Comms' },
  { path: `${HOME}/.openclaw/workspace-hustle`, label: 'Hustle' },
  { path: `${HOME}/.openclaw/workspace-pop`, label: 'Pop' },
  { path: `${HOME}/.openclaw/workspace-dad`, label: 'Dad' },
  { path: `${HOME}/.openclaw/workspace-tldr`, label: 'TLDR' },
  { path: `${HOME}/.openclaw/workspace-browser`, label: 'Browser' },
  { path: `${HOME}/.openclaw/workspace-answring`, label: 'Answring' },
  { path: `${HOME}/.openclaw/workspace-answring-dev`, label: 'Answring Dev' },
  { path: `${HOME}/.openclaw/workspace-answring-marketing`, label: 'Answring Marketing' },
  { path: `${HOME}/.openclaw/workspace-answring-ops`, label: 'Answring Ops' },
  { path: `${HOME}/.openclaw/workspace-answring-sales`, label: 'Answring Sales' },
  { path: `${HOME}/.openclaw/workspace-answring-security`, label: 'Answring Security' },
  { path: `${HOME}/.openclaw/workspace-answring-strategist`, label: 'Answring Strategist' },
  { path: `${HOME}/mission-control/src`, label: 'Mission Control' },
];

const TEXT_EXTENSIONS = new Set([
  'md', 'txt', 'json', 'ts', 'tsx', 'js', 'jsx', 'py', 'sh', 'yaml', 'yml',
  'toml', 'env', 'csv', 'html', 'css', 'xml', 'log', 'conf', 'ini', 'gitignore', 'lock',
]);

function getFileIcon(ext: string) {
  if (ext === 'md' || ext === 'txt') return <FileText size={14} className="text-indigo-400" />;
  if (ext === 'json') return <FileJson size={14} className="text-yellow-400" />;
  if (['ts', 'tsx', 'js', 'jsx', 'py'].includes(ext)) return <Code size={14} className="text-green-400" />;
  if (['sh', 'conf', 'ini', 'toml', 'yaml', 'yml', 'env'].includes(ext)) return <Terminal size={14} className="text-orange-400" />;
  if (['html', 'css', 'xml'].includes(ext)) return <FileType size={14} className="text-purple-400" />;
  return <File size={14} className="text-neutral-500" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState(`${HOME}/.openclaw/memory`);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWorkspace = WORKSPACES.find(w =>
    currentPath === w.path || currentPath.startsWith(w.path + '/')
  );

  const fetchDir = useCallback(async (dirPath: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
      if (res.ok) {
        setEntries(await res.json());
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDir(currentPath);
  }, [currentPath, fetchDir]);

  const navigateTo = (dirPath: string) => {
    setCurrentPath(dirPath);
    setSelectedFile(null);
    setEditMode(false);
  };

  const openFile = async (entry: FileEntry) => {
    setSelectedFile(entry);
    setEditMode(false);
    setSaveStatus('idle');

    if (TEXT_EXTENSIONS.has(entry.ext)) {
      setContentLoading(true);
      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(entry.path)}`);
        if (res.ok) {
          const data = await res.json();
          setFileContent(data.content);
        } else {
          setFileContent('');
        }
      } catch {
        setFileContent('');
      }
      setContentLoading(false);
    } else {
      setFileContent('');
    }
  };

  const startEdit = () => {
    setEditContent(fileContent);
    setEditMode(true);
    setSaveStatus('idle');
  };

  const cancelEdit = () => {
    setEditMode(false);
    setSaveStatus('idle');
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/files/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile.path, content: editContent }),
      });
      if (res.ok) {
        setFileContent(editContent);
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
          setEditMode(false);
        }, 1500);
      } else {
        setSaveStatus('idle');
      }
    } catch {
      setSaveStatus('idle');
    }
  };

  const deleteFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedFile?.path === filePath) {
          setSelectedFile(null);
        }
        fetchDir(currentPath);
      }
    } catch { /* ignore */ }
    setDeleteConfirm(null);
  };

  const uploadFile = async (file: globalThis.File) => {
    const formData = new FormData();
    formData.append('path', currentPath);
    formData.append('file', file);
    try {
      await fetch('/api/files', { method: 'POST', body: formData });
      fetchDir(currentPath);
    } catch { /* ignore */ }
  };

  // Breadcrumb segments
  const breadcrumbs = (() => {
    if (!activeWorkspace) return [];
    const rel = currentPath.slice(activeWorkspace.path.length);
    const parts = rel.split('/').filter(Boolean);
    const crumbs = [{ label: activeWorkspace.label, path: activeWorkspace.path }];
    let acc = activeWorkspace.path;
    for (const part of parts) {
      acc += '/' + part;
      crumbs.push({ label: part, path: acc });
    }
    return crumbs;
  })();

  return (
    <div className="flex gap-0 h-[calc(100vh-48px)]">
      {/* Left panel — workspace tree */}
      <div className="w-[220px] flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-3 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <FolderOpen size={14} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-extrabold gradient-text tracking-tight">Files</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {WORKSPACES.map(ws => {
            const isActive = currentPath === ws.path || currentPath.startsWith(ws.path + '/');
            return (
              <button
                key={ws.path}
                onClick={() => navigateTo(ws.path)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-100 ${
                  isActive
                    ? 'bg-indigo-500/[0.15] text-white border border-indigo-500/20'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Folder size={12} className={isActive ? 'text-indigo-400' : 'text-neutral-600'} />
                <span className="truncate">{ws.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center panel — file list */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedFile ? 'hidden lg:flex' : 'flex'}`}>
        {/* Breadcrumb + upload */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] gap-2">
          <div className="flex items-center gap-1 text-[12px] min-w-0 overflow-hidden">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight size={10} className="text-neutral-600" />}
                <button
                  onClick={() => navigateTo(crumb.path)}
                  className={`hover:text-white transition-colors truncate max-w-[140px] ${
                    i === breadcrumbs.length - 1 ? 'text-white font-semibold' : 'text-neutral-500'
                  }`}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all shrink-0"
          >
            <Upload size={12} />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {/* File listing */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-neutral-600">
              <FolderOpen size={24} className="mb-2 text-neutral-700" />
              <p className="text-xs">Empty directory</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-neutral-600 uppercase tracking-wider border-b border-white/[0.04]">
                  <th className="text-left py-2 px-4 font-semibold">Name</th>
                  <th className="text-right py-2 px-3 font-semibold w-[80px]">Size</th>
                  <th className="text-right py-2 px-4 font-semibold w-[100px]">Modified</th>
                  <th className="w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr
                    key={entry.path}
                    onClick={() => entry.type === 'dir' ? navigateTo(entry.path) : openFile(entry)}
                    className={`cursor-pointer border-b border-white/[0.02] transition-colors group ${
                      selectedFile?.path === entry.path
                        ? 'bg-indigo-500/[0.08]'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2.5">
                        {entry.type === 'dir'
                          ? <Folder size={14} className="text-indigo-400 shrink-0" />
                          : getFileIcon(entry.ext)
                        }
                        <span className="text-[13px] text-white truncate">{entry.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 text-[11px] text-neutral-500">
                      {entry.type === 'file' ? formatSize(entry.size) : '—'}
                    </td>
                    <td className="text-right py-2 px-4 text-[11px] text-neutral-600">
                      {formatDate(entry.modified)}
                    </td>
                    <td className="py-2 px-2">
                      {entry.type === 'file' && (
                        deleteConfirm === entry.path ? (
                          <button
                            onClick={e => { e.stopPropagation(); deleteFile(entry.path); }}
                            className="text-[10px] text-red-400 font-semibold hover:text-red-300"
                          >
                            Yes?
                          </button>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(entry.path); setTimeout(() => setDeleteConfirm(null), 3000); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 border-t border-white/[0.06] text-[10px] text-neutral-600 flex items-center gap-3">
          <span>{entries.filter(e => e.type === 'dir').length} folders</span>
          <span>{entries.filter(e => e.type === 'file').length} files</span>
        </div>
      </div>

      {/* Right panel — preview / editor */}
      {selectedFile && (
        <div className="w-[420px] flex-shrink-0 border-l border-white/[0.06] flex flex-col lg:flex hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {getFileIcon(selectedFile.ext)}
              <span className="text-[13px] font-semibold text-white truncate">{selectedFile.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {selectedFile.ext === 'md' && (
                editMode ? (
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Eye size={11} /> Preview
                  </button>
                ) : (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                )
              )}
              <button
                onClick={() => { setSelectedFile(null); setEditMode(false); }}
                className="p-1.5 rounded hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {contentLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : TEXT_EXTENSIONS.has(selectedFile.ext) ? (
              editMode ? (
                <div className="flex flex-col h-full">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="flex-1 w-full bg-transparent text-[13px] text-neutral-300 font-mono p-4 resize-none outline-none leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06]">
                    <span className="text-[11px] text-neutral-600">
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved \u2713' : 'Editing'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveFile}
                        disabled={saveStatus === 'saving'}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors disabled:opacity-50"
                      >
                        {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedFile.ext === 'md' ? (
                <div className="p-5 markdown-content">
                  <ReactMarkdown>{fileContent}</ReactMarkdown>
                </div>
              ) : (
                <pre className="p-4 text-[12px] text-neutral-400 font-mono whitespace-pre-wrap break-words leading-relaxed overflow-auto">
                  {fileContent}
                </pre>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-2 p-6">
                <File size={28} className="text-neutral-700" />
                <p className="text-xs font-medium">{selectedFile.name}</p>
                <p className="text-[11px] text-neutral-700">{formatSize(selectedFile.size)} &middot; {formatDate(selectedFile.modified)}</p>
                <p className="text-[11px] text-neutral-600 mt-2">Cannot preview binary file</p>
              </div>
            )}
          </div>

          {/* File info footer */}
          {!editMode && (
            <div className="px-4 py-2 border-t border-white/[0.06] text-[10px] text-neutral-600 flex items-center gap-3">
              <span>{formatSize(selectedFile.size)}</span>
              <span>{formatDate(selectedFile.modified)}</span>
              {selectedFile.ext && <span>.{selectedFile.ext}</span>}
            </div>
          )}
        </div>
      )}

      {/* Mobile preview overlay */}
      {selectedFile && (
        <div className="fixed inset-0 bg-[#0a0a0f] z-50 flex flex-col lg:hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {getFileIcon(selectedFile.ext)}
              <span className="text-[13px] font-semibold text-white truncate">{selectedFile.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {selectedFile.ext === 'md' && (
                editMode ? (
                  <button onClick={cancelEdit} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <Eye size={11} /> Preview
                  </button>
                ) : (
                  <button onClick={startEdit} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <Edit3 size={11} /> Edit
                  </button>
                )
              )}
              <button
                onClick={() => { setSelectedFile(null); setEditMode(false); }}
                className="p-1.5 rounded hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {contentLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : TEXT_EXTENSIONS.has(selectedFile.ext) ? (
              editMode ? (
                <div className="flex flex-col h-full">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="flex-1 w-full bg-transparent text-[13px] text-neutral-300 font-mono p-4 resize-none outline-none leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06]">
                    <span className="text-[11px] text-neutral-600">
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved \u2713' : 'Editing'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors">Cancel</button>
                      <button onClick={saveFile} disabled={saveStatus === 'saving'} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors disabled:opacity-50">
                        {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedFile.ext === 'md' ? (
                <div className="p-5 markdown-content"><ReactMarkdown>{fileContent}</ReactMarkdown></div>
              ) : (
                <pre className="p-4 text-[12px] text-neutral-400 font-mono whitespace-pre-wrap break-words leading-relaxed">{fileContent}</pre>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-2 p-6">
                <File size={28} className="text-neutral-700" />
                <p className="text-xs font-medium">{selectedFile.name}</p>
                <p className="text-[11px] text-neutral-700">{formatSize(selectedFile.size)} &middot; {formatDate(selectedFile.modified)}</p>
                <p className="text-[11px] text-neutral-600 mt-2">Cannot preview binary file</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
