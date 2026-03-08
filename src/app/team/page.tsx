'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, X, Send, Square, Activity } from 'lucide-react';

interface AgentDef {
  id: string;
  name: string;
  role: string;
  emoji: string;
  isLead?: boolean;
}

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: string;
  lastActiveMs: number;
  lastTask: string | null;
  workspace: string;
  model: string;
  sessionId: string | null;
}

const BABBAGE: AgentDef = { id: 'main', name: 'Babbage', role: 'Chief of Staff', emoji: '🤖' };

const ANSWRING_TEAM: AgentDef[] = [
  { id: 'answring',            name: 'Maya',    role: 'Team Lead', emoji: '📞', isLead: true },
  { id: 'answring-sales',      name: 'Sal',     role: 'Sales',     emoji: '💰' },
  { id: 'answring-qa',         name: 'Quinn',   role: 'QA',        emoji: '🔍' },
  { id: 'answring-strategist', name: 'Stella',  role: 'Strategy',  emoji: '🧠' },
  { id: 'answring-ops',        name: 'Opie',    role: 'Ops',       emoji: '📊' },
  { id: 'answring-dev',        name: 'Devin',   role: 'Dev',       emoji: '💻' },
  { id: 'answring-marketing',  name: 'Marcus',  role: 'Marketing', emoji: '📣' },
  { id: 'answring-security',   name: 'Cera',    role: 'Security',  emoji: '🔒' },
];

const DEV_TEAM: AgentDef[] = [
  { id: 'code-monkey',   name: 'Code Monkey', role: 'Eng Manager', emoji: '🐒', isLead: true },
  { id: 'code-frontend', name: 'Frontend',    role: 'Frontend',    emoji: '🎨' },
  { id: 'code-backend',  name: 'Backend',     role: 'Backend',     emoji: '⚙️' },
  { id: 'code-devops',   name: 'DevOps',      role: 'DevOps',      emoji: '🔧' },
  { id: 'code-webdev',   name: 'WebDev',      role: 'WebDev',      emoji: '🖥️' },
  { id: 'ralph',         name: 'Ralph',       role: 'QA Lead',     emoji: '✅' },
];

const SPECIALISTS: AgentDef[] = [
  { id: 'tldr',    name: 'Cliff',         role: 'Digest',          emoji: '📰' },
  { id: 'browser', name: 'Crawler',       role: 'Web Research',    emoji: '🌐' },
  { id: 'forge',   name: 'Forge',         role: 'Builder',         emoji: '🔨' },
  { id: 'hustle',  name: 'Hustle',        role: 'Growth',          emoji: '💼' },
  { id: 'pixel',   name: 'Pixel',         role: 'Image Generation', emoji: '🎨' },
  { id: 'roadie',  name: 'Roadie',        role: 'Logistics',       emoji: '🎸' },
  { id: 'docs',    name: 'The Professor', role: 'Docs & Research', emoji: '📚' },
];

const ALL_AGENTS = [BABBAGE, ...ANSWRING_TEAM, ...DEV_TEAM, ...SPECIALISTS];

function timeAgo(ms: number): string {
  if (!ms) return 'Never';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function AgentCard({ agent, status, onClick }: { agent: AgentDef; status?: AgentStatus; onClick: () => void }) {
  const isWorking = status?.status === 'working';
  const isIdle = !status || status.status === 'idle';
  const isLead = agent.isLead;
  return (
    <button
      onClick={onClick}
      className={`group text-left flex flex-col gap-2 rounded-xl border p-3 bg-[#1e1e20] transition-all duration-300 cursor-pointer hover:bg-[#252528] hover:border-white/[0.15] ${isLead ? 'sm:col-span-2 p-4' : ''} ${isWorking ? 'border-green-500/40 shadow-[0_0_12px_rgba(74,222,128,0.2)]' : 'border-white/[0.07]'}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          {isWorking && <span className="absolute inset-0 rounded-lg animate-ping bg-green-400/20 pointer-events-none" />}
          <div className={`relative ${isLead ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-lg'} rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center z-10`}>
            <span aria-hidden="true">{agent.emoji}</span>
          </div>
          {isWorking ? (
            <span className="absolute -bottom-0.5 -right-0.5 z-20 text-[7px] font-black bg-green-500 text-black px-1 py-px rounded leading-none tracking-wide uppercase">LIVE</span>
          ) : (
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1e1e20] z-20 ${isIdle ? 'bg-yellow-400' : 'bg-neutral-600'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${isLead ? 'text-sm' : 'text-xs'} font-bold text-white/90 leading-tight truncate`}>{agent.name}</p>
          <p className="text-[10px] text-neutral-500 leading-tight truncate">{agent.role}</p>
        </div>
      </div>
      {isWorking && status?.lastTask && (
        <div className="pt-1.5 border-t border-green-500/20">
          <p className="text-[9px] text-green-300 truncate leading-tight" title={status.lastTask}>{status.lastTask}</p>
        </div>
      )}
    </button>
  );
}

function BabbageCard({ status, onClick }: { status?: AgentStatus; onClick: () => void }) {
  const isWorking = status?.status === 'working';
  const isIdle = !status || status.status === 'idle';
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-base" aria-hidden="true">⭐</span>
        <h3 className="text-xs font-bold text-neutral-400 tracking-[0.12em] uppercase">Chief of Staff</h3>
      </div>
      <button
        onClick={onClick}
        className={`group text-left w-full max-w-sm flex items-center gap-4 rounded-2xl border p-5 bg-[#1e1e20] transition-all duration-300 cursor-pointer hover:bg-[#252528] hover:border-white/[0.2] ${isWorking ? 'border-green-500/40 shadow-[0_0_20px_rgba(74,222,128,0.25)]' : 'border-indigo-500/25 shadow-[0_0_20px_rgba(99,102,241,0.1)]'}`}
      >
        <div className="relative flex-shrink-0">
          {isWorking && <span className="absolute inset-0 rounded-xl animate-ping bg-green-400/20 pointer-events-none" />}
          <div className="relative w-14 h-14 text-3xl rounded-xl bg-white/[0.07] border border-white/[0.1] flex items-center justify-center z-10">
            <span aria-hidden="true">🤖</span>
          </div>
          {isWorking ? (
            <span className="absolute -bottom-1 -right-1 z-20 text-[7px] font-black bg-green-500 text-black px-1.5 py-px rounded leading-none tracking-wide uppercase">LIVE</span>
          ) : (
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e1e20] z-20 ${isIdle ? 'bg-yellow-400' : 'bg-neutral-600'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-extrabold text-white/95 leading-tight">Babbage</p>
          <p className="text-xs text-indigo-400/80 leading-tight mt-0.5">Chief of Staff</p>
          {isWorking && status?.lastTask && (
            <p className="text-[10px] text-green-300 truncate leading-tight mt-1.5" title={status.lastTask}>{status.lastTask}</p>
          )}
        </div>
      </button>
    </div>
  );
}

function AgentCommandPanel({ agent, status, onClose }: { agent: AgentDef; status?: AgentStatus; onClose: () => void }) {
  const isWorking = status?.status === 'working';
  const [feedData, setFeedData] = useState<string[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [dmMessage, setDmMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentFeedback, setSentFeedback] = useState(false);
  const [stopping, setStopping] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const prevFeedLenRef = useRef(0);

  // Fetch feed
  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agent.id}/feed?limit=30`);
      const data = await res.json();
      if (data.lines && Array.isArray(data.lines)) {
        setFeedData(data.lines);
      }
    } catch { /* silent */ }
    setFeedLoading(false);
  }, [agent.id]);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, 5_000);
    return () => clearInterval(id);
  }, [fetchFeed]);

  // Auto-scroll feed on new content
  useEffect(() => {
    if (feedData.length > prevFeedLenRef.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
    prevFeedLenRef.current = feedData.length;
  }, [feedData]);

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`/api/agents/${agent.id}/stop`, { method: 'POST' });
    } catch { /* silent */ }
    setStopping(false);
  };

  const handleSend = async () => {
    if (!dmMessage.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/agents/${agent.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: dmMessage.trim() }),
      });
      setDmMessage('');
      setSentFeedback(true);
      setTimeout(() => setSentFeedback(false), 2000);
    } catch { /* silent */ }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Slide-out panel */}
      <div
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[480px] bg-[#1a1a1c] border-l border-white/[0.1] shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-5">
          {/* 1. Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-2xl">
                <span aria-hidden="true">{agent.emoji}</span>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">{agent.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-neutral-400">{agent.role}</span>
                  {isWorking ? (
                    <span className="text-[9px] font-black bg-green-500 text-black px-1.5 py-0.5 rounded leading-none tracking-wide uppercase">LIVE</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-[10px] text-yellow-400/80">Idle</span>
                    </span>
                  )}
                </div>
                {status?.model && (
                  <p className="text-[10px] font-mono text-neutral-500 mt-1">{status.model}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] transition-colors flex-shrink-0">
              <X size={14} />
            </button>
          </div>

          {/* 2. Stop Button */}
          {status?.sessionId && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:opacity-60 text-white font-bold text-sm rounded-lg px-4 py-2.5 transition-colors"
            >
              <Square size={14} />
              {stopping ? 'Stopping...' : 'Stop Agent'}
            </button>
          )}

          {/* 3. Send Message */}
          <div>
            <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase mb-2">Send Message</p>
            <div className="flex gap-2">
              <textarea
                value={dmMessage}
                onChange={e => setDmMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                rows={2}
                placeholder="Type a message..."
                className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={sending || !dmMessage.trim()}
                className="self-end bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors flex-shrink-0"
              >
                {sentFeedback ? (
                  <span className="text-xs font-bold">Sent ✓</span>
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>

          {/* 4. Current Task */}
          <div>
            <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase mb-2">Current Task</p>
            {status?.lastTask ? (
              <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3">
                <p className="text-xs text-green-300 leading-relaxed">{status.lastTask}</p>
                {status.lastActiveMs > 0 && (
                  <p className="text-[9px] text-green-500/60 mt-1.5">{timeAgo(Date.now() - status.lastActiveMs)}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No active task</p>
            )}
          </div>

          {/* 5. Live Feed */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase">Live Feed</p>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" title="Auto-refreshing every 5s" />
            </div>
            <div
              ref={feedRef}
              className="max-h-64 overflow-y-auto bg-black/40 rounded-lg p-3 font-mono text-[10px] text-neutral-300 scrollbar-thin"
            >
              {feedLoading ? (
                <p className="text-neutral-500">Loading feed...</p>
              ) : feedData.length === 0 ? (
                <p className="text-neutral-500">No activity yet</p>
              ) : (
                feedData.map((line, i) => (
                  <div key={i} className="py-0.5 border-b border-white/[0.03] last:border-0 break-words">{line}</div>
                ))
              )}
            </div>
          </div>

          {/* 6. Metadata Footer */}
          <div className="border-t border-white/[0.08] pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] font-bold text-neutral-600 tracking-wider uppercase mb-0.5">Workspace</p>
                <p className="text-[10px] font-mono text-neutral-400 truncate" title={status?.workspace ? (status.workspace.split('/').pop() || status.workspace) : 'N/A'}>{status?.workspace ? (status.workspace.split('/').pop() || status.workspace) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-neutral-600 tracking-wider uppercase mb-0.5">Session</p>
                <p className="text-[10px] font-mono text-neutral-400 truncate" title={status?.sessionId || 'N/A'}>{status?.sessionId ? `${status.sessionId.slice(0, 12)}...` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-neutral-600 tracking-wider uppercase mb-0.5">Last Active</p>
                <p className="text-[10px] text-neutral-400">{status?.lastActiveMs ? timeAgo(Date.now() - status.lastActiveMs) : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase flex-shrink-0">{label}</p>
      <p className={`text-xs text-neutral-300 truncate text-right ${mono ? 'font-mono text-[11px]' : ''}`} title={value}>{value}</p>
    </div>
  );
}

function TeamGroup({ icon, title, agents, statusMap, onInspect }: { icon: string; title: string; agents: AgentDef[]; statusMap: Map<string, AgentStatus>; onInspect: (agent: AgentDef) => void }) {
  const activeCount = agents.filter(a => statusMap.get(a.id)?.status === 'working').length;
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-base" aria-hidden="true">{icon}</span>
        <h3 className="text-xs font-bold text-neutral-400 tracking-[0.12em] uppercase">{title}</h3>
        {activeCount > 0 && (
          <span className="flex items-center gap-1 bg-green-950/40 border border-green-500/30 rounded px-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-bold text-green-400">{activeCount}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {[...agents].sort((a, b) => { if (a.isLead && !b.isLead) return -1; if (!a.isLead && b.isLead) return 1; return a.name.localeCompare(b.name); }).map(agent => (
          <AgentCard key={agent.id} agent={agent} status={statusMap.get(agent.id)} onClick={() => onInspect(agent)} />
        ))}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [statusMap, setStatusMap] = useState<Map<string, AgentStatus>>(new Map());
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [inspecting, setInspecting] = useState<AgentDef | null>(null);
  const initialLoadedRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/office');
      const raw = await res.json();
      const data: AgentStatus[] = Array.isArray(raw) ? raw : raw.agents || [];
      if (data.length >= 0) {
        const map = new Map<string, AgentStatus>();
        for (const agent of data) map.set(agent.id, agent);
        setStatusMap(map);
        setLastFetchTime(Date.now());
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (initialLoadedRef.current) return;
    initialLoadedRef.current = true;
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const id = setInterval(fetchStatus, 15_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const totalAgents = ALL_AGENTS.length;
  const activeCount = ALL_AGENTS.filter(a => statusMap.get(a.id)?.status === 'working').length;
  const updatedAgo = lastFetchTime ? timeAgo(lastFetchTime) : '...';

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Users size={16} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Agent Fleet</h2>
            <p className="text-xs text-neutral-500">{totalAgents} agents · Updated {updatedAgo}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {activeCount > 0 && (
            <div className="flex items-center gap-2 bg-green-950/40 border border-green-500/30 rounded-lg px-3 py-1.5 shadow-[0_0_10px_rgba(74,222,128,0.15)]">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <span className="text-sm font-black text-green-400">{activeCount} LIVE</span>
            </div>
          )}
          <span className="text-xs font-mono text-neutral-600">{totalAgents} total</span>
        </div>
      </div>

      {/* Babbage — Chief of Staff */}
      <BabbageCard status={statusMap.get(BABBAGE.id)} onClick={() => setInspecting(BABBAGE)} />

      {/* Divider */}
      <div className="border-t border-white/[0.06] mb-8" />

      {/* Team Groups */}
      <div className="flex flex-col gap-8">
        <TeamGroup icon="📞" title="Answring" agents={ANSWRING_TEAM} statusMap={statusMap} onInspect={setInspecting} />
        <TeamGroup icon="💻" title="Dev Team" agents={DEV_TEAM} statusMap={statusMap} onInspect={setInspecting} />
        <TeamGroup icon="🔧" title="Specialists" agents={SPECIALISTS} statusMap={statusMap} onInspect={setInspecting} />
      </div>

      {inspecting && statusMap.size > 0 && (
        <AgentCommandPanel agent={inspecting} status={statusMap.get(inspecting.id)} onClose={() => setInspecting(null)} />
      )}
    </div>
  );
}
