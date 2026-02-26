'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';

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
}

// ── Data ─────────────────────────────────────────────────────────────────────

const COMMAND: AgentMeta[] = [
  { id: 'sir',     name: 'Sir',     emoji: '👑', title: 'CEO & Owner',    tags: ['Leadership', 'Strategy', 'Oversight'] },
  { id: 'babbage', name: 'Babbage', emoji: '🤖', title: 'Chief of Staff', tags: ['Coordination', 'Planning', 'Delegation', 'Reporting'] },
];

const QA: AgentMeta[] = [
  { id: 'ralph', name: 'Ralph', emoji: '✅', title: 'Fleet-wide QA Reviewer', tags: ['Quality Assurance', 'Code Review', 'Monitoring', 'Standards'] },
];

const MANAGERS: AgentMeta[] = [
  { id: 'answring',    name: 'Answring Manager', emoji: '📞', title: 'Answring Operations Lead', tags: ['Operations', 'Client Services', 'Team Lead'] },
  { id: 'code-monkey', name: 'Code Monkey',      emoji: '🐒', title: 'Engineering Manager',      tags: ['Engineering', 'Delegation', 'Code Review'] },
  { id: 'hustle',      name: 'Hustle',            emoji: '💼', title: 'Business Development',     tags: ['Sales', 'Outreach', 'Growth'] },
  { id: 'roadie',      name: 'Roadie',            emoji: '🎸', title: 'Content & Creative Lead',  tags: ['Content', 'Creative', 'Production'] },
  { id: 'tldr',        name: 'TLDR',              emoji: '📰', title: 'News & Briefings',         tags: ['Research', 'Summarization', 'Intel'] },
];

// Workers grouped by their manager
const WORKER_GROUPS: { manager: string; agents: AgentMeta[] }[] = [
  {
    manager: 'code-monkey',
    agents: [
      { id: 'code-frontend', name: 'Code Frontend', emoji: '🎨', title: 'Frontend Engineer',  tags: ['React', 'Next.js', 'TypeScript', 'Tailwind'] },
      { id: 'code-backend',  name: 'Code Backend',  emoji: '⚙️', title: 'Backend Engineer',   tags: ['Python', 'FastAPI', 'SQLite', 'APIs'] },
      { id: 'code-devops',   name: 'Code DevOps',   emoji: '🔧', title: 'DevOps Engineer',    tags: ['Docker', 'systemd', 'nginx', 'Deploy'] },
    ],
  },
  {
    manager: 'answring',
    agents: [
      { id: 'answring-ops',        name: 'Answring Ops',        emoji: '📊', title: 'Operations Specialist', tags: ['Operations', 'Process', 'Reporting'] },
      { id: 'answring-dev',        name: 'Answring Dev',        emoji: '💻', title: 'Dev Specialist',        tags: ['Development', 'Integration', 'Tools'] },
      { id: 'answring-marketing',  name: 'Answring Marketing',  emoji: '📣', title: 'Marketing Specialist',  tags: ['Marketing', 'Copy', 'Campaigns'] },
      { id: 'answring-security',   name: 'Answring Security',   emoji: '🔒', title: 'Security Specialist',   tags: ['Security', 'Compliance', 'Audit'] },
      { id: 'answring-strategist', name: 'Answring Strategist', emoji: '🧠', title: 'Strategy Specialist',   tags: ['Strategy', 'Analysis', 'Planning'] },
      { id: 'answring-sales',      name: 'Answring Sales',      emoji: '💰', title: 'Sales Specialist',      tags: ['Sales', 'Outreach', 'Pipeline'] },
    ],
  },
];

const SUPPORT: AgentMeta[] = [
  { id: 'browser', name: 'Browser Agent', emoji: '🌐', title: 'Web Research & Automation',  tags: ['Web', 'Research', 'Automation'] },
  { id: 'comms',   name: 'Comms Agent',   emoji: '📱', title: 'Communications & Messaging', tags: ['Telegram', 'Notifications', 'Messaging'] },
];

const ALL_WORKER_IDS = new Set(WORKER_GROUPS.flatMap(g => g.agents.map(a => a.id)));

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseUtc(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

function resolveStatus(status: string, updatedAt: string): string {
  if (status !== 'working') return status;
  const ageMs = Date.now() - parseUtc(updatedAt).getTime();
  return ageMs > 10 * 60 * 1000 ? 'idle' : 'working';
}

// ── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  status,
  currentTask,
  small = false,
}: {
  agent: AgentMeta;
  status: string;
  currentTask?: string;
  small?: boolean;
}) {
  const isOwner   = status === 'owner';
  const isWorking = !isOwner && (status === 'working' || status === 'active');
  const isIdle    = !isOwner && status === 'idle';

  const cardClasses = isOwner
    ? 'card flex flex-col gap-2.5 border border-yellow-500/30 bg-yellow-950/10 transition-all duration-300'
    : isWorking
    ? 'card flex flex-col gap-2.5 border border-green-500/40 bg-green-950/20 shadow-[0_0_15px_rgba(74,222,128,0.3)] transition-all duration-300'
    : isIdle
    ? 'card flex flex-col gap-2.5 border border-white/[0.06] opacity-60 transition-all duration-300'
    : 'card flex flex-col gap-2.5 border border-white/[0.04] opacity-35 grayscale transition-all duration-300';

  const padding = small ? 'p-3' : 'p-4';
  const avatarSize = small ? 'w-9 h-9 text-xl' : 'w-12 h-12 text-2xl';
  const nameSize   = small ? 'text-xs' : 'text-sm';

  return (
    <div className={`${cardClasses} ${padding}`}>
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {isWorking && (
            <span className="absolute inset-0 rounded-xl animate-ping bg-green-400/20 pointer-events-none" />
          )}
          <div className={`relative ${avatarSize} rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center z-10`}>
            {agent.emoji}
          </div>
          {!isOwner && (isWorking ? (
            <span className="absolute -bottom-1 -right-1 z-20 text-[9px] font-black bg-green-500 text-black px-1 py-0.5 rounded leading-none tracking-wide uppercase">
              LIVE
            </span>
          ) : (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f] z-20 ${isIdle ? 'bg-yellow-400' : 'bg-neutral-600'}`}
              title={isIdle ? 'Idle' : 'Offline'}
            />
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`${nameSize} font-bold truncate ${isWorking ? 'text-white' : 'text-white/80'}`}>
            {agent.name}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{agent.title}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {agent.tags.map(tag => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.07] text-neutral-400 font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      {isWorking && currentTask && (
        <div className="mt-auto pt-2 border-t border-green-500/20">
          <div className="flex items-center gap-1.5 bg-green-950/40 rounded-md px-2 py-1.5">
            <span className="text-green-400/60 text-[10px] font-bold uppercase tracking-wide flex-shrink-0">task</span>
            <p className="text-[10px] text-green-300 truncate leading-tight flex-1" title={currentTask}>
              {currentTask}
            </p>
            <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse flex-shrink-0 rounded-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${color} flex-shrink-0`} />
      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em]">{label}</span>
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[10px] text-neutral-600">{count} agent{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [stations, setStations] = useState<OfficeStation[]>([]);

  const fetchStations = useCallback(async () => {
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

  const isWorkerActive = (id: string) => {
    const { status } = getInfo(id);
    return status === 'working' || status === 'active';
  };

  // Stats
  const allAgents = [
    ...COMMAND, ...QA, ...MANAGERS,
    ...WORKER_GROUPS.flatMap(g => g.agents),
    ...SUPPORT,
  ];
  const visibleAgents = allAgents.filter(a => !ALL_WORKER_IDS.has(a.id) || isWorkerActive(a.id));
  const activeCount = visibleAgents.filter(a => ['working', 'active'].includes(getInfo(a.id).status)).length;
  const idleCount   = visibleAgents.filter(a => getInfo(a.id).status === 'idle').length;

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">{visibleAgents.length}</span>
            <span className="text-xs text-neutral-500">Agents</span>
          </div>
        </div>
      </div>

      <div className="space-y-10">

        {/* ── Command ── */}
        <section>
          <SectionHeader label="Command" color="from-yellow-500 to-amber-600" count={COMMAND.length} />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {COMMAND.map(a => {
              const { status, currentTask } = getInfo(a.id);
              return <AgentCard key={a.id} agent={a} status={status} currentTask={currentTask} />;
            })}
          </div>
        </section>

        {/* ── QA ── */}
        <section>
          <SectionHeader label="QA" color="from-rose-500 to-pink-600" count={QA.length} />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {QA.map(a => {
              const { status, currentTask } = getInfo(a.id);
              return <AgentCard key={a.id} agent={a} status={status} currentTask={currentTask} />;
            })}
          </div>
        </section>

        {/* ── Operations — Managers ── */}
        <section>
          <SectionHeader label="Operations — Managers" color="from-indigo-500 to-purple-600" count={MANAGERS.length} />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {MANAGERS.map(a => {
              const { status, currentTask } = getInfo(a.id);
              return <AgentCard key={a.id} agent={a} status={status} currentTask={currentTask} />;
            })}
          </div>
        </section>

        {/* ── Operations — Workers ── */}
        {(() => {
          const activeGroups = WORKER_GROUPS.map(g => ({
            ...g,
            active: g.agents.filter(a => isWorkerActive(a.id)),
          })).filter(g => g.active.length > 0);

          const totalActive = activeGroups.reduce((n, g) => n + g.active.length, 0);

          // Always show the section (dimmed) so it's clear sub-agents exist
          const allWorkers = WORKER_GROUPS.flatMap(g => g.agents);

          return (
            <section>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0" />
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em]">
                  Operations — Workers
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
                {totalActive > 0 ? (
                  <span className="text-[10px] text-green-400 font-bold">{totalActive} active</span>
                ) : (
                  <span className="text-[10px] text-neutral-600">sub-agents</span>
                )}
              </div>

              {/* Sub-agents note */}
              <p className="text-[10px] text-neutral-600 mb-4 ml-5">
                Sub-agents — spawned on demand, appear here when active
              </p>

              {/* Grouped by manager */}
              <div className="space-y-5">
                {WORKER_GROUPS.map(group => {
                  const managerMeta = MANAGERS.find(m => m.id === group.manager)!;
                  const activeWorkers = group.agents.filter(a => isWorkerActive(a.id));
                  const showAll = activeWorkers.length === 0; // show dimmed placeholders when none active

                  return (
                    <div key={group.manager} className="pl-4 border-l-2 border-white/[0.05]">
                      {/* Manager label */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">{managerMeta.emoji}</span>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                          {managerMeta.name}&apos;s workers
                        </span>
                      </div>

                      {showAll ? (
                        /* Dimmed ghost cards when no workers active */
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 opacity-30">
                          {group.agents.map(a => (
                            <AgentCard key={a.id} agent={a} status="offline" small />
                          ))}
                        </div>
                      ) : (
                        /* Full cards for active workers */
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                          {activeWorkers.map(a => {
                            const { status, currentTask } = getInfo(a.id);
                            return <AgentCard key={a.id} agent={a} status={status} currentTask={currentTask} small />;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── Support ── */}
        <section>
          <SectionHeader label="Support" color="from-cyan-500 to-blue-600" count={SUPPORT.length} />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {SUPPORT.map(a => {
              const { status, currentTask } = getInfo(a.id);
              return <AgentCard key={a.id} agent={a} status={status} currentTask={currentTask} />;
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
