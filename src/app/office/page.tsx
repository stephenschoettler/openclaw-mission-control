'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Monitor } from 'lucide-react';

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
const statusConfig: Record<string, { label: string; color: string; bg: string; dotBg: string; borderColor: string; pulse: boolean }> = {
  working: { label: 'Working', color: 'text-green-400', bg: 'bg-green-500/12', dotBg: 'bg-green-400', borderColor: 'border-green-500/25', pulse: true },
  idle: { label: 'Idle', color: 'text-yellow-400', bg: 'bg-yellow-500/12', dotBg: 'bg-yellow-400', borderColor: 'border-yellow-500/25', pulse: false },
  offline: { label: 'Offline', color: 'text-neutral-500', bg: 'bg-white/[0.04]', dotBg: 'bg-neutral-600', borderColor: 'border-white/[0.06]', pulse: false },
};

const AGENT_COLORS = [
  'from-indigo-500 to-blue-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-purple-600',
];

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function OfficePage() {
  const [stations, setStations] = useState<OfficeStation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState('');

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

  const cycleStatus = async (station: OfficeStation) => {
    const currentIdx = STATUS_CYCLE.indexOf(station.status as typeof STATUS_CYCLE[number]);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    await fetch('/api/office', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: station.agent_id, status: nextStatus }) });
    fetchData();
  };

  const updateTask = async (agentId: string) => {
    await fetch('/api/office', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: agentId, current_task: taskInput }) });
    setEditingTask(null);
    setTaskInput('');
    fetchData();
  };

  const workingCount = stations.filter(s => s.status === 'working').length;
  const idleCount = stations.filter(s => s.status === 'idle').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
            <Building2 size={16} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">The Office</h2>
            <p className="text-xs text-neutral-500">Agent workstations — click status to cycle, click task to edit</p>
          </div>
        </div>
        {/* Status legend */}
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
            <div className="w-2 h-2 rounded-full bg-neutral-600" />
            <span className="text-[10px] text-neutral-500">Offline</span>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-5 px-1">
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
          <span className="text-xs text-neutral-500">Total stations</span>
        </div>
      </div>

      {stations.length === 0 && agents.length === 0 ? (
        <div className="card p-12 text-center">
          <Monitor size={32} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No agents configured yet</p>
          <p className="text-xs text-neutral-600 mt-1">Add agents to ~/.openclaw/openclaw.json to see workstations</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {stations.map((station, idx) => {
            const cfg = statusConfig[station.status] || statusConfig.idle;
            return (
              <div key={station.agent_id} className="card card-glow p-5">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${AGENT_COLORS[idx % AGENT_COLORS.length]} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {getInitials(station.agent_name)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${cfg.dotBg} border-2 border-[#0a0a0f] ${cfg.pulse ? 'pulse-dot' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">{station.agent_name}</h3>
                      <Monitor size={13} className="text-neutral-600 flex-shrink-0" />
                    </div>
                    {station.role && <p className="text-[11px] text-neutral-500 mt-0.5">{station.role}</p>}
                    <button onClick={() => cycleStatus(station)} className={`mt-2 text-[10px] px-2.5 py-1 rounded-full font-semibold ${cfg.color} ${cfg.bg} border ${cfg.borderColor} hover:brightness-125 transition-all`}>
                      {cfg.label}
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <p className="text-[10px] text-neutral-600 mb-1 font-medium uppercase tracking-wider">Current Task</p>
                  {editingTask === station.agent_id ? (
                    <div className="flex gap-1.5">
                      <input
                        value={taskInput}
                        onChange={e => setTaskInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && updateTask(station.agent_id)}
                        className="flex-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                        autoFocus
                      />
                      <button onClick={() => updateTask(station.agent_id)} className="px-2 py-1 bg-indigo-500 text-white rounded text-[10px] font-medium">Save</button>
                      <button onClick={() => setEditingTask(null)} className="px-2 py-1 bg-white/[0.06] text-neutral-400 rounded text-[10px]">X</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingTask(station.agent_id); setTaskInput(station.current_task); }}
                      className="text-xs text-neutral-400 hover:text-white transition-colors text-left w-full"
                    >
                      {station.current_task || '— click to set —'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
