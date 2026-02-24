'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Cpu, FolderOpen } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  model?: string;
  workspace?: string;
  [key: string]: unknown;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/agents');
    setAgents(await res.json());
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const models = agents.reduce<Record<string, number>>((acc, a) => {
    const m = a.model || 'unknown';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Team</h2>

      {/* Fleet Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-indigo-400" />
            <span className="text-xs text-neutral-400">Total Agents</span>
          </div>
          <p className="text-2xl font-bold text-white">{agents.length}</p>
        </div>
        <div className="col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={16} className="text-purple-400" />
            <span className="text-xs text-neutral-400">Models Breakdown</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(models).map(([model, count]) => (
              <span key={model} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-neutral-300">
                {model} <span className="text-neutral-500">({count})</span>
              </span>
            ))}
            {agents.length === 0 && <span className="text-xs text-neutral-600">No agents configured</span>}
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      {agents.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <Users size={32} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No agents found in openclaw.json</p>
          <p className="text-xs text-neutral-600 mt-1">Configure agents in ~/.openclaw/openclaw.json</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getInitials(agent.name || agent.id)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{agent.name || agent.id}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{agent.id}</p>
                  {agent.model && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Cpu size={12} className="text-neutral-500" />
                      <span className="text-xs text-neutral-400">{agent.model}</span>
                    </div>
                  )}
                  {agent.workspace && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <FolderOpen size={12} className="text-neutral-500" />
                      <span className="text-xs text-neutral-400 truncate">{agent.workspace}</span>
                    </div>
                  )}
                  <div className="mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
