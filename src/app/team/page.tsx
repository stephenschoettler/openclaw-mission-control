'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Cpu, FolderOpen, Sparkles } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  model?: string;
  workspace?: string;
  [key: string]: unknown;
}

interface OfficeStation {
  agent_id: string;
  status: string;
  current_task: string;
}

const AGENT_COLORS = [
  'from-indigo-500 to-blue-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-indigo-600',
];

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getColor(index: number): string {
  return AGENT_COLORS[index % AGENT_COLORS.length];
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stations, setStations] = useState<OfficeStation[]>([]);

  const fetchData = useCallback(async () => {
    const [aRes, oRes] = await Promise.all([fetch('/api/agents'), fetch('/api/office')]);
    setAgents(await aRes.json());
    setStations(await oRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, [fetchData]);

  const models = agents.reduce<Record<string, number>>((acc, a) => {
    const m = a.model || 'unknown';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const getStation = (agentId: string) => stations.find(s => s.agent_id === agentId);

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold gradient-text tracking-tight">Meet the Team</h2>
        <p className="text-sm text-neutral-500 mt-2">{agents.length} AI agents, each with a real role in the fleet</p>
      </div>

      {/* Fleet Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Users size={16} className="text-indigo-400" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Total Agents</span>
          </div>
          <p className="text-2xl font-bold text-white">{agents.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <Sparkles size={16} className="text-green-400" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Active Now</span>
          </div>
          <p className="text-2xl font-bold text-white">{stations.filter(s => s.status === 'working').length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Cpu size={16} className="text-purple-400" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Models</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Object.entries(models).map(([model, count]) => (
              <span key={model} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 font-medium">
                {model} <span className="text-neutral-600">({count})</span>
              </span>
            ))}
            {agents.length === 0 && <span className="text-xs text-neutral-600">None configured</span>}
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      {agents.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={32} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No agents found in openclaw.json</p>
          <p className="text-xs text-neutral-600 mt-1">Configure agents in ~/.openclaw/openclaw.json</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent, idx) => {
            const station = getStation(agent.id);
            const status = station?.status || 'offline';
            const currentTask = station?.current_task;
            return (
              <div key={agent.id} className="card card-glow p-5 group">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getColor(idx)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {getInitials(agent.name || agent.id)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0a0a0f] ${
                      status === 'working' ? 'bg-green-400 pulse-dot' : status === 'idle' ? 'bg-yellow-400' : 'bg-neutral-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{agent.name || agent.id}</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">{agent.id}</p>
                    {agent.model && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Cpu size={11} className="text-neutral-500" />
                        <span className="text-[11px] text-neutral-400">{agent.model}</span>
                      </div>
                    )}
                    {agent.workspace && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <FolderOpen size={11} className="text-neutral-500" />
                        <span className="text-[11px] text-neutral-400 truncate">{agent.workspace}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status + Task */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    status === 'working'
                      ? 'text-green-400 bg-green-500/12 border border-green-500/20'
                      : status === 'idle'
                      ? 'text-yellow-400 bg-yellow-500/12 border border-yellow-500/20'
                      : 'text-neutral-500 bg-white/[0.04] border border-white/[0.06]'
                  }`}>
                    {status === 'working' ? 'Working' : status === 'idle' ? 'Idle' : 'Offline'}
                  </span>
                  {currentTask && (
                    <span className="text-[10px] text-neutral-500 truncate max-w-[140px]" title={currentTask}>
                      {currentTask}
                    </span>
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
