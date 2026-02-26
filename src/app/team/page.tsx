'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, ChevronRight } from 'lucide-react';

interface OfficeStation {
  agent_id: string;
  agent_name: string;
  status: string;
  current_task: string;
  updated_at: string;
}

interface AgentMeta {
  id: string;
  name: string;
  emoji: string;
  title: string;
  tags: string[];
  accent: string;
}

const SIR: AgentMeta = {
  id: 'sir', name: 'Sir', emoji: '👑', title: 'CEO & Owner',
  tags: ['Leadership', 'Strategy', 'Oversight'], accent: 'yellow',
};

const BABBAGE: AgentMeta = {
  id: 'babbage', name: 'Babbage', emoji: '🤖', title: 'Chief of Staff',
  tags: ['Coordination', 'Planning', 'Delegation'], accent: 'indigo',
};

const MANAGERS: AgentMeta[] = [
  { id: 'code-monkey', name: 'Code Monkey', emoji: '🐒', title: 'Engineering Manager',      tags: ['Engineering', 'Delegation', 'Code Review'], accent: 'orange' },
  { id: 'answring',    name: 'Maya',        emoji: '📞', title: 'Answring Operations Lead', tags: ['Operations', 'Client Services', 'Team Lead'], accent: 'blue'   },
  { id: 'hustle',      name: 'Hustle',      emoji: '💼', title: 'Business Development',    tags: ['Sales', 'Outreach', 'Growth'],                accent: 'green'  },
  { id: 'roadie',      name: 'Roadie',      emoji: '🎸', title: 'Content & Creative Lead', tags: ['Content', 'Creative', 'Production'],          accent: 'yellow' },
];

const RALPH: AgentMeta = {
  id: 'ralph', name: 'Ralph', emoji: '✅', title: 'Fleet-wide QA Reviewer',
  tags: ['Quality Assurance', 'Code Review', 'Standards'], accent: 'pink',
};

const SUPPORT: AgentMeta[] = [
  { id: 'tldr',    name: 'TLDR',          emoji: '📰', title: 'News & Briefings',          tags: ['Research', 'Summarization', 'Intel'],     accent: 'purple' },
  { id: 'browser', name: 'Browser Agent', emoji: '🌐', title: 'Web Research & Automation', tags: ['Web', 'Research', 'Automation'],          accent: 'cyan'   },
  { id: 'comms',   name: 'Comms Agent',   emoji: '📱', title: 'Communications & Messaging', tags: ['Telegram', 'Notifications', 'Messaging'], accent: 'red'    },
];

const WORKER_GROUPS: { manager: string; agents: AgentMeta[] }[] = [
  {
    manager: 'code-monkey',
    agents: [
      { id: 'code-frontend', name: 'Code Frontend', emoji: '🎨', title: 'Frontend Engineer', tags: ['React', 'Next.js', 'TypeScript'], accent: 'orange' },
      { id: 'code-backend',  name: 'Code Backend',  emoji: '⚙️',  title: 'Backend Engineer',  tags: ['Python', 'FastAPI', 'SQLite'],    accent: 'orange' },
      { id: 'code-devops',   name: 'Code DevOps',   emoji: '🔧', title: 'DevOps Engineer',   tags: ['Docker', 'systemd', 'Deploy'],    accent: 'orange' },
    ],
  },
  {
    manager: 'answring',
    agents: [
      { id: 'answring-ops',        name: 'Felix', emoji: '📊', title: 'Ops Specialist',       tags: ['Operations', 'Process'],   accent: 'blue' },
      { id: 'answring-dev',        name: 'Zoe',   emoji: '💻', title: 'Dev Specialist',       tags: ['Development', 'Tools'],    accent: 'blue' },
      { id: 'answring-marketing',  name: 'Leo',   emoji: '📣', title: 'Marketing Specialist', tags: ['Marketing', 'Campaigns'],  accent: 'blue' },
      { id: 'answring-security',   name: 'Iris',  emoji: '🔒', title: 'Security Specialist',  tags: ['Security', 'Compliance'], accent: 'blue' },
      { id: 'answring-strategist', name: 'Theo',  emoji: '🧠', title: 'Strategy Specialist',  tags: ['Strategy', 'Analysis'],   accent: 'blue' },
      { id: 'answring-sales',      name: 'Nadia', emoji: '💰', title: 'Sales Specialist',     tags: ['Sales', 'Pipeline'],       accent: 'blue' },
      { id: 'answring-qa',         name: 'Quinn', emoji: '🔍', title: 'QA Specialist',        tags: ['QA', 'Testing'],           accent: 'blue' },
    ],
  },
];

const ACCENT_TAG: Record<string, string> = {
  yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
  orange: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
  blue:   'bg-blue-500/10   border-blue-500/20   text-blue-300',
  green:  'bg-green-500/10  border-green-500/20  text-green-300',
  pink:   'bg-pink-500/10   border-pink-500/20   text-pink-300',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  cyan:   'bg-cyan-500/10   border-cyan-500/20   text-cyan-300',
  red:    'bg-red-500/10    border-red-500/20    text-red-300',
};

const ACCENT_GLOW: Record<string, string> = {
  yellow: 'shadow-[0_0_20px_rgba(234,179,8,0.2)] border-yellow-500/30',
  indigo: 'shadow-[0_0_20px_rgba(99,102,241,0.2)] border-indigo-500/30',
  orange: 'shadow-[0_0_20px_rgba(249,115,22,0.2)] border-orange-500/30',
  blue:   'shadow-[0_0_20px_rgba(59,130,246,0.2)] border-blue-500/30',
  green:  'shadow-[0_0_20px_rgba(74,222,128,0.2)] border-green-500/30',
  pink:   'shadow-[0_0_20px_rgba(236,72,153,0.2)] border-pink-500/30',
  purple: 'shadow-[0_0_20px_rgba(168,85,247,0.2)] border-purple-500/30',
  cyan:   'shadow-[0_0_20px_rgba(6,182,212,0.2)] border-cyan-500/30',
  red:    'shadow-[0_0_20px_rgba(239,68,68,0.2)] border-red-500/30',
};

const ACCENT_BORDER: Record<string, string> = {
  orange: 'border-orange-500/20',
  blue:   'border-blue-500/20',
  green:  'border-green-500/20',
  yellow: 'border-yellow-500/20',
};

function parseUtc(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

function resolveStatus(status: string, updatedAt: string): string {
  if (status !== 'working') return status;
  const ageMs = Date.now() - parseUtc(updatedAt).getTime();
  return ageMs > 3 * 60 * 1000 ? 'idle' : 'working';
}

// ── Compact sub-agent card ────────────────────────────────────────────────────

function SubAgentCard({ agent, status, currentTask }: { agent: AgentMeta; status: string; currentTask?: string }) {
  const isWorking = status === 'working' || status === 'active';
  const isIdle    = status === 'idle';

  const border = isWorking
    ? 'border-green-500/40 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
    : 'border-white/[0.07]';
  const opacity = !isWorking && !isIdle ? 'opacity-50 grayscale' : isIdle ? 'opacity-70' : '';

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 bg-[#1e1e20] transition-all duration-300 ${border} ${opacity}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          {isWorking && (
            <span className="absolute inset-0 rounded-lg animate-ping bg-green-400/20 pointer-events-none" />
          )}
          <div className="relative w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg z-10">
            {agent.emoji}
          </div>
          {isWorking ? (
            <span className="absolute -bottom-0.5 -right-0.5 z-20 text-[8px] font-black bg-green-500 text-black px-0.5 py-px rounded leading-none tracking-wide uppercase">
              ON
            </span>
          ) : (
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1e1e20] z-20 ${isIdle ? 'bg-yellow-400' : 'bg-neutral-600'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white/90 truncate">{agent.name}</p>
          <p className="text-[10px] text-neutral-500 leading-tight truncate">{agent.title}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {agent.tags.slice(0, 2).map(tag => (
          <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${ACCENT_TAG[agent.accent]}`}>
            {tag}
          </span>
        ))}
      </div>

      {isWorking && currentTask && (
        <div className="pt-1 border-t border-green-500/20">
          <p className="text-[9px] text-green-300 truncate leading-tight" title={currentTask}>{currentTask}</p>
        </div>
      )}
    </div>
  );
}

// ── Expandable manager card ───────────────────────────────────────────────────

function ExpandableManagerCard({
  agent, status, currentTask, subAgents, getInfo,
}: {
  agent: AgentMeta;
  status: string;
  currentTask?: string;
  subAgents: AgentMeta[];
  getInfo: (id: string) => { status: string; currentTask?: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const isWorking = status === 'working' || status === 'active';
  const isIdle    = status === 'idle';

  const activeSubCount = subAgents.filter(a => {
    const { status: s } = getInfo(a.id);
    return s === 'working' || s === 'active';
  }).length;

  const baseBorder = isWorking
    ? 'border-green-500/40 shadow-[0_0_15px_rgba(74,222,128,0.25)]'
    : expanded
    ? 'border-white/[0.12]'
    : 'border-white/[0.07]';
  const opacity = !isWorking && !isIdle ? 'opacity-50 grayscale' : isIdle ? 'opacity-75' : '';

  return (
    <div className={`flex flex-col rounded-2xl border bg-[#252528] transition-all duration-300 ${baseBorder} ${opacity}`}>
      {/* Clickable header */}
      <div
        className="flex flex-col gap-3 p-4 cursor-pointer select-none hover:bg-white/[0.02] transition-colors duration-200 rounded-2xl"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {isWorking && (
              <span className="absolute inset-0 rounded-xl animate-ping bg-green-400/20 pointer-events-none" />
            )}
            <div className="relative w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-2xl z-10">
              {agent.emoji}
            </div>
            {isWorking ? (
              <span className="absolute -bottom-1 -right-1 z-20 text-[9px] font-black bg-green-500 text-black px-1 py-0.5 rounded leading-none tracking-wide uppercase">
                LIVE
              </span>
            ) : (
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#141414] z-20 ${isIdle ? 'bg-yellow-400' : 'bg-neutral-600'}`} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white/90 truncate">{agent.name}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight truncate">{agent.title}</p>
          </div>

          {/* Chevron */}
          <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 ${expanded ? 'bg-white/[0.08] text-white/70' : 'text-neutral-600'}`}>
            <ChevronRight size={13} className={`transition-transform duration-300 ${expanded ? 'rotate-90' : 'rotate-0'}`} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {agent.tags.map(tag => (
            <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ACCENT_TAG[agent.accent]}`}>
              {tag}
            </span>
          ))}
        </div>

        {isWorking && currentTask && (
          <div className="pt-2 border-t border-green-500/20">
            <div className="flex items-center gap-1.5 bg-green-950/40 rounded-md px-2 py-1.5">
              <span className="text-green-400/60 text-[10px] font-bold uppercase tracking-wide flex-shrink-0">task</span>
              <p className="text-[10px] text-green-300 truncate leading-tight flex-1" title={currentTask}>{currentTask}</p>
              <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse flex-shrink-0 rounded-sm" />
            </div>
          </div>
        )}

        {!expanded && (
          <p className="text-[10px] text-neutral-600 flex items-center gap-1.5">
            ↳ {subAgents.length} workers
            {activeSubCount > 0 && <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> {activeSubCount} active</>}
          </p>
        )}
      </div>

      {/* Sub-team panel */}
      <div
        style={{
          maxHeight: expanded ? `${subAgents.length * 130 + 80}px` : '0px',
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s ease-in-out, opacity 0.3s ease-in-out',
        }}
      >
        <div className={`mx-3 mb-3 rounded-xl border ${ACCENT_BORDER[agent.accent] ?? 'border-white/[0.07]'} bg-black/20 p-3`}>
          <p className="text-[10px] font-bold text-neutral-500 tracking-[0.12em] uppercase mb-2.5">
            Sub-team · {subAgents.length} members
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {subAgents.map(sub => (
              <SubAgentCard key={sub.id} agent={sub} {...getInfo(sub.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Standard grid card ────────────────────────────────────────────────────────

function GridCard({ agent, status, currentTask }: { agent: AgentMeta; status: string; currentTask?: string }) {
  const isWorking = status === 'working' || status === 'active';
  const isIdle    = status === 'idle';
  const border = isWorking ? 'border-green-500/40 shadow-[0_0_15px_rgba(74,222,128,0.25)]' : 'border-white/[0.07]';
  const opacity = !isWorking && !isIdle ? 'opacity-50 grayscale' : isIdle ? 'opacity-75' : '';

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 bg-[#252528] transition-all duration-300 ${border} ${opacity}`}>
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {isWorking && <span className="absolute inset-0 rounded-xl animate-ping bg-green-400/20 pointer-events-none" />}
          <div className="relative w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-2xl z-10">
            {agent.emoji}
          </div>
          {isWorking ? (
            <span className="absolute -bottom-1 -right-1 z-20 text-[9px] font-black bg-green-500 text-black px-1 py-0.5 rounded leading-none tracking-wide uppercase">LIVE</span>
          ) : (
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#141414] z-20 ${isIdle ? 'bg-yellow-400' : 'bg-neutral-600'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white/90 truncate">{agent.name}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight truncate">{agent.title}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {agent.tags.map(tag => (
          <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ACCENT_TAG[agent.accent]}`}>{tag}</span>
        ))}
      </div>
      {isWorking && currentTask && (
        <div className="mt-auto pt-2 border-t border-green-500/20">
          <div className="flex items-center gap-1.5 bg-green-950/40 rounded-md px-2 py-1.5">
            <span className="text-green-400/60 text-[10px] font-bold uppercase tracking-wide flex-shrink-0">task</span>
            <p className="text-[10px] text-green-300 truncate leading-tight flex-1" title={currentTask}>{currentTask}</p>
            <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse flex-shrink-0 rounded-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wide card ─────────────────────────────────────────────────────────────────

function WideCard({ agent, status, currentTask }: { agent: AgentMeta; status: string; currentTask?: string }) {
  const isOwner   = agent.id === 'sir';
  const isWorking = !isOwner && (status === 'working' || status === 'active');
  const isIdle    = !isOwner && status === 'idle';
  const border = isWorking
    ? 'border-green-500/40 shadow-[0_0_20px_rgba(74,222,128,0.25)]'
    : isOwner ? `border-yellow-500/20 ${ACCENT_GLOW[agent.accent]}` : 'border-white/[0.07]';
  const opacity = !isOwner && !isWorking && !isIdle ? 'opacity-50 grayscale' : isIdle ? 'opacity-75' : '';

  return (
    <div className={`flex items-center gap-5 rounded-2xl border p-5 bg-[#252528] transition-all duration-300 ${border} ${opacity}`}>
      <div className="relative flex-shrink-0">
        {isWorking && <span className="absolute inset-0 rounded-2xl animate-ping bg-green-400/20 pointer-events-none" />}
        <div className="relative w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-3xl z-10">{agent.emoji}</div>
        {!isOwner && (isWorking ? (
          <span className="absolute -bottom-1 -right-1 z-20 text-[9px] font-black bg-green-500 text-black px-1 py-0.5 rounded leading-none tracking-wide uppercase">LIVE</span>
        ) : (
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#141414] z-20 ${isIdle ? 'bg-yellow-400' : 'bg-neutral-600'}`} />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-white">{agent.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{agent.title}</p>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {agent.tags.map(tag => (
            <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ACCENT_TAG[agent.accent]}`}>{tag}</span>
          ))}
        </div>
      </div>
      {isWorking && currentTask && (
        <div className="flex-shrink-0 max-w-xs">
          <div className="flex items-center gap-1.5 bg-green-950/40 rounded-lg px-3 py-2">
            <span className="text-green-400/60 text-[10px] font-bold uppercase tracking-wide flex-shrink-0">task</span>
            <p className="text-[11px] text-green-300 truncate leading-tight flex-1" title={currentTask}>{currentTask}</p>
            <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse flex-shrink-0 rounded-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Flow label ────────────────────────────────────────────────────────────────

function FlowLabel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-5 bg-white/10" />
      <span className="text-[10px] font-bold text-neutral-500 tracking-[0.15em] uppercase px-3 py-1 rounded-full border border-white/[0.06] bg-[#1a1a1c]">{label}</span>
      <div className="w-px h-5 bg-white/10" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [stations, setStations] = useState<OfficeStation[]>([]);

  const fetchStations = useCallback(async () => {
    try {
      const res  = await fetch('/api/agent-status');
      const data = await res.json();
      if (Array.isArray(data)) { setStations(data); return; }
    } catch { /* try fallback */ }
    try {
      const res  = await fetch('/api/office');
      const data: OfficeStation[] = await res.json();
      setStations(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStations(); }, [fetchStations]);
  useEffect(() => {
    const id = setInterval(fetchStations, 15000);
    return () => clearInterval(id);
  }, [fetchStations]);

  const getInfo = (agentId: string): { status: string; currentTask?: string } => {
    if (agentId === 'sir') return { status: 'owner' };
    const s = stations.find(st => st.agent_id === agentId);
    if (!s) return { status: 'idle' };
    const resolved = resolveStatus(s.status, s.updated_at ?? new Date().toISOString());
    return { status: resolved, currentTask: s.current_task || undefined };
  };

  const isActive = (id: string) => { const { status } = getInfo(id); return status === 'working' || status === 'active'; };

  const namedAgents = [SIR, BABBAGE, ...MANAGERS, RALPH, ...SUPPORT];
  const activeCount = namedAgents.filter(a => isActive(a.id)).length;
  const idleCount   = namedAgents.filter(a => getInfo(a.id).status === 'idle').length;
  const totalWorkers = WORKER_GROUPS.reduce((n, g) => n + g.agents.length, 0);
  const activeWorkerCount = WORKER_GROUPS.flatMap(g => g.agents).filter(a => isActive(a.id)).length;

  const expandableIds = new Set(WORKER_GROUPS.map(g => g.manager));
  const getSubAgents = (id: string) => WORKER_GROUPS.find(g => g.manager === id)?.agents ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Users size={16} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Agent Team</h2>
            <p className="text-xs text-neutral-500">Fleet hierarchy · live status · 15s refresh</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 bg-green-950/40 border border-green-500/30 rounded-lg px-3 py-1.5 shadow-[0_0_10px_rgba(74,222,128,0.15)]">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="text-sm font-black text-green-400">{activeCount} LIVE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-[10px] text-neutral-500">{idleCount} Idle</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <WideCard agent={SIR} {...getInfo(SIR.id)} />
        <FlowLabel label="↓ COMMAND" />
        <WideCard agent={BABBAGE} {...getInfo(BABBAGE.id)} />
        <FlowLabel label="⚙ OPERATIONS" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MANAGERS.map(a =>
            expandableIds.has(a.id) ? (
              <ExpandableManagerCard
                key={a.id}
                agent={a}
                {...getInfo(a.id)}
                subAgents={getSubAgents(a.id)}
                getInfo={getInfo}
              />
            ) : (
              <GridCard key={a.id} agent={a} {...getInfo(a.id)} />
            )
          )}
        </div>

        <div className="mt-3 ml-1">
          {activeWorkerCount > 0 ? (
            <p className="text-[11px] text-green-400/70 font-medium">↳ {activeWorkerCount} worker{activeWorkerCount !== 1 ? 's' : ''} active · click manager cards to expand</p>
          ) : (
            <p className="text-[11px] text-neutral-600">↳ {totalWorkers} workers on standby · click manager cards to expand</p>
          )}
        </div>

        <FlowLabel label="🔍 QA LAYER" />
        <WideCard agent={RALPH} {...getInfo(RALPH.id)} />
        <FlowLabel label="⚡ SUPPORT" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SUPPORT.map(a => <GridCard key={a.id} agent={a} {...getInfo(a.id)} />)}
        </div>
      </div>
    </div>
  );
}
