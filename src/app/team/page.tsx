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

interface Layer {
  label: string;
  color: string;
  agents: AgentMeta[];
}

// Sub-agents hidden unless actively working
const SUB_AGENT_IDS = new Set([
  'code-frontend', 'code-backend', 'code-devops',
  'answring-ops', 'answring-dev', 'answring-marketing',
  'answring-security', 'answring-strategist', 'answring-sales',
]);

const LAYERS: Layer[] = [
  {
    label: 'Command',
    color: 'from-yellow-500 to-amber-600',
    agents: [
      {
        id: 'sir',
        name: 'Sir',
        emoji: '👑',
        title: 'CEO & Owner',
        tags: ['Leadership', 'Strategy', 'Oversight'],
      },
      {
        id: 'main',
        name: 'Babbage',
        emoji: '🤖',
        title: 'Chief of Staff',
        tags: ['Coordination', 'Planning', 'Delegation', 'Reporting'],
      },
    ],
  },
  {
    label: 'Operations',
    color: 'from-indigo-500 to-purple-600',
    agents: [
      {
        id: 'answring',
        name: 'Answring Manager',
        emoji: '📞',
        title: 'Answring Operations Lead',
        tags: ['Operations', 'Client Services', 'Team Lead'],
      },
      {
        id: 'code-monkey',
        name: 'Code Monkey',
        emoji: '🐒',
        title: 'Engineering Manager',
        tags: ['Engineering', 'Delegation', 'Code Review'],
      },
      {
        id: 'hustle',
        name: 'Hustle',
        emoji: '💼',
        title: 'Business Development',
        tags: ['Sales', 'Outreach', 'Growth'],
      },
      {
        id: 'roadie',
        name: 'Roadie',
        emoji: '🎸',
        title: 'Content & Creative Lead',
        tags: ['Content', 'Creative', 'Production'],
      },
      {
        id: 'tldr',
        name: 'TLDR',
        emoji: '📰',
        title: 'News & Briefings',
        tags: ['Research', 'Summarization', 'Intel'],
      },
    ],
  },
  {
    label: 'Specialists',
    color: 'from-emerald-500 to-teal-600',
    agents: [
      {
        id: 'code-frontend',
        name: 'Code Frontend',
        emoji: '🎨',
        title: 'Frontend Engineer',
        tags: ['React', 'Next.js', 'TypeScript', 'Tailwind'],
      },
      {
        id: 'code-backend',
        name: 'Code Backend',
        emoji: '⚙️',
        title: 'Backend Engineer',
        tags: ['Python', 'FastAPI', 'SQLite', 'APIs'],
      },
      {
        id: 'code-devops',
        name: 'Code DevOps',
        emoji: '🔧',
        title: 'DevOps Engineer',
        tags: ['Docker', 'systemd', 'nginx', 'Deploy'],
      },
      {
        id: 'answring-ops',
        name: 'Answring Ops',
        emoji: '📊',
        title: 'Operations Specialist',
        tags: ['Operations', 'Process', 'Reporting'],
      },
      {
        id: 'answring-dev',
        name: 'Answring Dev',
        emoji: '💻',
        title: 'Dev Specialist',
        tags: ['Development', 'Integration', 'Tools'],
      },
      {
        id: 'answring-marketing',
        name: 'Answring Marketing',
        emoji: '📣',
        title: 'Marketing Specialist',
        tags: ['Marketing', 'Copy', 'Campaigns'],
      },
      {
        id: 'answring-security',
        name: 'Answring Security',
        emoji: '🔒',
        title: 'Security Specialist',
        tags: ['Security', 'Compliance', 'Audit'],
      },
      {
        id: 'answring-strategist',
        name: 'Answring Strategist',
        emoji: '🧠',
        title: 'Strategy Specialist',
        tags: ['Strategy', 'Analysis', 'Planning'],
      },
      {
        id: 'answring-sales',
        name: 'Answring Sales',
        emoji: '💰',
        title: 'Sales Specialist',
        tags: ['Sales', 'Outreach', 'Pipeline'],
      },
    ],
  },
  {
    label: 'QA',
    color: 'from-rose-500 to-pink-600',
    agents: [
      {
        id: 'ralph',
        name: 'Ralph',
        emoji: '✅',
        title: 'Fleet-wide QA Reviewer',
        tags: ['Quality Assurance', 'Code Review', 'Monitoring', 'Standards'],
      },
    ],
  },
  {
    label: 'Support',
    color: 'from-cyan-500 to-blue-600',
    agents: [
      {
        id: 'browser',
        name: 'Browser Agent',
        emoji: '🌐',
        title: 'Web Research & Automation',
        tags: ['Web', 'Research', 'Automation'],
      },
      {
        id: 'comms',
        name: 'Comms Agent',
        emoji: '📱',
        title: 'Communications & Messaging',
        tags: ['Telegram', 'Notifications', 'Messaging'],
      },
    ],
  },
];

const STATUS_COLORS: Record<string, { dot: string; label: string; pulse: boolean; cardBorder: string }> = {
  working: { dot: 'bg-green-400', label: 'Working', pulse: true, cardBorder: 'border-green-500/30' },
  active:  { dot: 'bg-green-400', label: 'Active',  pulse: true, cardBorder: 'border-green-500/30' },
  idle:    { dot: 'bg-yellow-400', label: 'Idle',   pulse: false, cardBorder: 'border-white/[0.08]' },
  offline: { dot: 'bg-neutral-600', label: 'Offline', pulse: false, cardBorder: 'border-white/[0.04]' },
};

function getStatusCfg(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.idle;
}

function parseUtc(dateStr: string): Date {
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

/** Resolve display status — stale "working" (>10 min) → "idle" */
function resolveStatus(status: string, updatedAt: string): string {
  if (status !== 'working') return status;
  const ageMs = Date.now() - parseUtc(updatedAt).getTime();
  return ageMs > 10 * 60 * 1000 ? 'idle' : 'working';
}

function AgentCard({
  agent,
  status,
  currentTask,
}: {
  agent: AgentMeta;
  status: string;
  currentTask?: string;
}) {
  const cfg = getStatusCfg(status);
  const isWorking = status === 'working' || status === 'active';

  return (
    <div
      className={`card p-4 flex flex-col gap-2.5 border ${cfg.cardBorder} ${isWorking ? 'shadow-[0_0_16px_0_rgba(34,197,94,0.10)]' : ''} transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-2xl">
            {agent.emoji}
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f] ${cfg.dot} ${cfg.pulse ? 'pulse-dot' : ''}`}
            title={cfg.label}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{agent.name}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{agent.title}</p>
          {isWorking && currentTask && (
            <p className="text-[10px] text-green-400 mt-1 truncate leading-tight" title={currentTask}>
              ↳ {currentTask}
            </p>
          )}
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
    </div>
  );
}

export default function TeamPage() {
  const [stations, setStations] = useState<OfficeStation[]>([]);

  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch('/api/office');
      const data: OfficeStation[] = await res.json();
      setStations(data);
    } catch {
      // silently fail — status dots show idle
    }
  }, []);

  useEffect(() => { fetchStations(); }, [fetchStations]);
  useEffect(() => {
    const id = setInterval(fetchStations, 15000);
    return () => clearInterval(id);
  }, [fetchStations]);

  const getStationInfo = (agentId: string): { status: string; currentTask?: string } => {
    if (agentId === 'sir') return { status: 'active' };
    const s = stations.find(st => st.agent_id === agentId);
    if (!s) return { status: 'idle' };
    const resolved = resolveStatus(s.status, s.updated_at ?? new Date().toISOString());
    return { status: resolved, currentTask: s.current_task || undefined };
  };

  // Flatten all agents, respecting sub-agent visibility rules
  const allAgents = LAYERS.flatMap(l => l.agents);
  const visibleAgentIds = new Set(
    allAgents
      .filter(a => {
        if (!SUB_AGENT_IDS.has(a.id)) return true;
        const { status } = getStationInfo(a.id);
        return status === 'working';
      })
      .map(a => a.id)
  );

  const totalAgents = allAgents.filter(a => visibleAgentIds.has(a.id)).length;
  const activeCount = allAgents
    .filter(a => visibleAgentIds.has(a.id))
    .filter(a => ['working', 'active'].includes(getStationInfo(a.id).status)).length;
  const idleCount = allAgents
    .filter(a => visibleAgentIds.has(a.id))
    .filter(a => getStationInfo(a.id).status === 'idle').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-[10px] text-neutral-500">{activeCount} Working</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-[10px] text-neutral-500">{idleCount} Idle</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">{totalAgents}</span>
            <span className="text-xs text-neutral-500">Agents</span>
          </div>
        </div>
      </div>

      {/* Layers */}
      <div className="space-y-8">
        {LAYERS.map(layer => {
          const visibleAgents = layer.agents.filter(a => visibleAgentIds.has(a.id));
          if (visibleAgents.length === 0) return null;
          return (
            <div key={layer.label}>
              {/* Layer divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${layer.color} flex-shrink-0`} />
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em]">
                  {layer.label}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-neutral-600">{visibleAgents.length} agent{visibleAgents.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Agent cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {visibleAgents.map(agent => {
                  const { status, currentTask } = getStationInfo(agent.id);
                  return (
                    <AgentCard key={agent.id} agent={agent} status={status} currentTask={currentTask} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
