'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';

interface OfficeStation {
  id: number;
  agent_id: string;
  agent_name: string;
  role: string;
  current_task: string;
  status: string;
}

interface Agent {
  id: string;
  name: string;
  model?: string;
}

const STATUS_CYCLE = ['working', 'idle', 'offline'] as const;
const statusConfig: Record<string, { label: string; color: string; dotBg: string; deskBg: string; deskBorder: string; pulse: boolean }> = {
  working: {
    label: 'Working',
    color: 'text-green-400',
    dotBg: 'bg-green-400',
    deskBg: 'bg-green-500/[0.06]',
    deskBorder: 'border-green-500/30',
    pulse: true,
  },
  idle: {
    label: 'Idle',
    color: 'text-neutral-500',
    dotBg: 'bg-yellow-400',
    deskBg: 'bg-white/[0.02]',
    deskBorder: 'border-white/[0.06]',
    pulse: false,
  },
  offline: {
    label: 'Offline',
    color: 'text-neutral-600',
    dotBg: 'bg-neutral-700',
    deskBg: 'bg-white/[0.01]',
    deskBorder: 'border-white/[0.04]',
    pulse: false,
  },
};

const AGENT_EMOJIS: Record<string, string> = {
  babbage: '🧠',
  ralph: '🎨',
  'code-monkey': '🐒',
  'code-frontend': '🖥️',
  'code-backend': '⚙️',
  'code-devops': '🚀',
  hustle: '💼',
  roadie: '🛣️',
  tldr: '📋',
  'answring-ops': '📞',
};

function getEmoji(agentId: string, name: string): string {
  const key = agentId.toLowerCase();
  return AGENT_EMOJIS[key] || name[0]?.toUpperCase() || '?';
}

export default function OfficePage() {
  const [stations, setStations] = useState<OfficeStation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [hoveredDesk, setHoveredDesk] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [stRes, agRes] = await Promise.all([fetch('/api/office'), fetch('/api/agents')]);
    const stationData: OfficeStation[] = await stRes.json();
    const agentData: Agent[] = await agRes.json();
    setAgents(agentData);

    for (const agent of agentData) {
      if (!stationData.find(s => s.agent_id === agent.id)) {
        await fetch('/api/office', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agent.id, agent_name: agent.name, role: agent.model || '', status: 'idle' })
        });
      }
    }

    if (agentData.length > stationData.length) {
      const res = await fetch('/api/office');
      setStations(await res.json());
    } else {
      setStations(stationData);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, [fetchData]);

  const cycleStatus = async (station: OfficeStation) => {
    const currentIdx = STATUS_CYCLE.indexOf(station.status as typeof STATUS_CYCLE[number]);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    await fetch('/api/office', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: station.agent_id, status: nextStatus }) });
    fetchData();
  };

  const workingCount = stations.filter(s => s.status === 'working').length;
  const idleCount = stations.filter(s => s.status === 'idle').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
            <Building2 size={16} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">The Office</h2>
            <p className="text-xs text-neutral-500">Floor plan — hover for current task, click dot to cycle status</p>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-[10px] text-neutral-500">Working</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-[10px] text-neutral-500">Idle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-neutral-700" />
            <span className="text-[10px] text-neutral-500">Offline</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 px-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-green-400">{workingCount}</span>
          <span className="text-xs text-neutral-500">Working</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-yellow-400">{idleCount}</span>
          <span className="text-xs text-neutral-500">Idle</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-white">{stations.length}</span>
          <span className="text-xs text-neutral-500">Total</span>
        </div>
      </div>

      {/* Floor Plan */}
      {stations.length === 0 && agents.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={32} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No agents configured yet</p>
          <p className="text-xs text-neutral-600 mt-1">Add agents to ~/.openclaw/openclaw.json to see workstations</p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        >
          {stations.map(station => {
            const cfg = statusConfig[station.status] || statusConfig.idle;
            const emoji = getEmoji(station.agent_id, station.agent_name);
            const isHovered = hoveredDesk === station.agent_id;

            return (
              <div
                key={station.agent_id}
                onMouseEnter={() => setHoveredDesk(station.agent_id)}
                onMouseLeave={() => setHoveredDesk(null)}
                className={`relative rounded-xl border p-4 transition-all duration-200 cursor-default ${cfg.deskBg} ${cfg.deskBorder} ${station.status === 'working' ? 'shadow-[0_0_16px_0_rgba(34,197,94,0.12)]' : ''}`}
              >
                {/* Desk label (top-right) */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => cycleStatus(station)}
                    className={`w-2.5 h-2.5 rounded-full ${cfg.dotBg} ${cfg.pulse ? 'pulse-dot' : ''} transition-transform hover:scale-150`}
                    title={`Status: ${cfg.label} — click to cycle`}
                  />
                </div>

                {/* Avatar */}
                <div className="text-3xl mb-2 leading-none select-none">{emoji}</div>

                {/* Name */}
                <div className="text-xs font-semibold text-white truncate">{station.agent_name}</div>
                <div className={`text-[10px] mt-0.5 ${cfg.color}`}>{cfg.label}</div>

                {/* Current task tooltip on hover */}
                {isHovered && station.current_task && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-48 bg-neutral-900 border border-white/[0.12] rounded-lg p-2.5 shadow-xl pointer-events-none">
                    <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1">Current Task</p>
                    <p className="text-xs text-white leading-snug">{station.current_task}</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/[0.12]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
