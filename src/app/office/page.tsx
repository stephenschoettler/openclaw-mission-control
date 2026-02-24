'use client';

import { useState, useEffect, useCallback } from 'react';

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
const statusConfig: Record<string, { label: string; color: string; bg: string; pulse: boolean }> = {
  working: { label: 'Working', color: 'text-green-400', bg: 'bg-green-500', pulse: true },
  idle: { label: 'Idle', color: 'text-yellow-400', bg: 'bg-yellow-500', pulse: false },
  offline: { label: 'Offline', color: 'text-neutral-500', bg: 'bg-neutral-500', pulse: false },
};

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

    // Ensure all agents have a station
    for (const agent of agentData) {
      if (!stationData.find(s => s.agent_id === agent.id)) {
        await fetch('/api/office', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agent.id, agent_name: agent.name, role: agent.model || '', status: 'idle' })
        });
      }
    }

    // Re-fetch after seeding
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Office</h2>
      <p className="text-sm text-neutral-500 mb-6">Agent workstations — click status to cycle, click task to edit</p>

      {stations.length === 0 && agents.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🖥️</p>
          <p className="text-sm text-neutral-500">No agents configured yet</p>
          <p className="text-xs text-neutral-600 mt-1">Add agents to ~/.openclaw/openclaw.json to see workstations</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
          {stations.map(station => {
            const cfg = statusConfig[station.status] || statusConfig.idle;
            return (
              <div key={station.agent_id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg ${cfg.pulse ? 'animate-pulse' : ''}`}>
                      {getInitials(station.agent_name)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${cfg.bg} border-2 border-[#0a0a0f]`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">{station.agent_name}</h3>
                      <span className="text-lg">🖥️</span>
                    </div>
                    {station.role && <p className="text-xs text-neutral-500 mt-0.5">{station.role}</p>}
                    <button onClick={() => cycleStatus(station)} className={`mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} bg-white/[0.04] hover:bg-white/[0.08] transition-colors`}>
                      {cfg.label}
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <p className="text-[10px] text-neutral-500 mb-1">Current Task</p>
                  {editingTask === station.agent_id ? (
                    <div className="flex gap-1.5">
                      <input
                        value={taskInput}
                        onChange={e => setTaskInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && updateTask(station.agent_id)}
                        className="flex-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-xs text-white outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <button onClick={() => updateTask(station.agent_id)} className="px-2 py-1 bg-indigo-500 text-white rounded text-[10px]">Save</button>
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
