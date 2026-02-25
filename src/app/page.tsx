'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckSquare, CalendarDays, Brain, Users, Film, Building2, Zap, TrendingUp, Clock, Activity } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  model?: string;
}

interface CronJob {
  id: string;
  name?: string;
  label?: string;
  schedule: string | { kind: string; expr: string };
  enabled?: boolean;
}

interface OfficeStation {
  agent_id: string;
  agent_name: string;
  status: string;
  current_task: string;
}

export default function OverviewPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [stations, setStations] = useState<OfficeStation[]>([]);
  const [memCount, setMemCount] = useState(0);

  const fetchAll = useCallback(async () => {
    const [tRes, aRes, cRes, oRes, mRes] = await Promise.all([
      fetch('/api/tasks'), fetch('/api/agents'), fetch('/api/crons'),
      fetch('/api/office'), fetch('/api/memory'),
    ]);
    setTasks(await tRes.json());
    setAgents(await aRes.json());
    setCrons(await cRes.json());
    setStations(await oRes.json());
    const memFiles = await mRes.json();
    setMemCount(Array.isArray(memFiles) ? memFiles.length : 0);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tasksByStatus = {
    backlog: tasks.filter(t => t.status === 'backlog').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };
  const completion = tasks.length > 0 ? Math.round((tasksByStatus.done / tasks.length) * 100) : 0;
  const workingAgents = stations.filter(s => s.status === 'working').length;
  const activeCrons = crons.filter(c => c.enabled !== false).length;

  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold gradient-text tracking-tight">Command Center</h1>
        <p className="text-sm text-neutral-500 mt-1">Fleet overview and system status</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 relative overflow-hidden shimmer-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Users size={16} className="text-indigo-400" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Fleet Size</span>
          </div>
          <p className="text-2xl font-bold text-white">{agents.length}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">{workingAgents} working now</p>
        </div>

        <div className="card p-4 relative overflow-hidden shimmer-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Completion</span>
          </div>
          <p className="text-2xl font-bold text-white">{completion}%</p>
          <div className="mt-1.5 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <div className="card p-4 relative overflow-hidden shimmer-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <CheckSquare size={16} className="text-purple-400" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Total Tasks</span>
          </div>
          <p className="text-2xl font-bold text-white">{tasks.length}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">{tasksByStatus.in_progress} in progress</p>
        </div>

        <div className="card p-4 relative overflow-hidden shimmer-hover">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <Zap size={16} className="text-orange-400" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">Automations</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeCrons}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">cron jobs active</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Fleet Status */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity size={14} className="text-indigo-400" />
              Fleet Status
            </h3>
            <Link href="/office" className="text-[11px] text-neutral-500 hover:text-indigo-400 transition-colors">View Office →</Link>
          </div>
          {stations.length === 0 ? (
            <p className="text-xs text-neutral-600 py-4 text-center">No agents online</p>
          ) : (
            <div className="space-y-2.5">
              {stations.map(s => (
                <div key={s.agent_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {s.agent_name?.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0f] ${
                      s.status === 'working' ? 'bg-green-400 pulse-dot' : s.status === 'idle' ? 'bg-yellow-400' : 'bg-neutral-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">{s.agent_name}</p>
                    <p className="text-[10px] text-neutral-500 truncate">{s.current_task || 'No active task'}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    s.status === 'working' ? 'text-green-400 bg-green-500/10' : s.status === 'idle' ? 'text-yellow-400 bg-yellow-500/10' : 'text-neutral-500 bg-white/[0.04]'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Clock size={14} className="text-purple-400" />
            Task Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
                <span className="text-xs text-neutral-400">Backlog</span>
              </div>
              <span className="text-sm font-semibold text-white">{tasksByStatus.backlog}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="text-xs text-neutral-400">In Progress</span>
              </div>
              <span className="text-sm font-semibold text-white">{tasksByStatus.in_progress}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-xs text-neutral-400">Done</span>
              </div>
              <span className="text-sm font-semibold text-white">{tasksByStatus.done}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <h4 className="text-[11px] text-neutral-500 font-medium mb-2">MEMORY BANK</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-indigo-400" />
                <span className="text-xs text-neutral-400">Files stored</span>
              </div>
              <span className="text-sm font-semibold text-white">{memCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks + Quick Nav */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Tasks</h3>
            <Link href="/tasks" className="text-[11px] text-neutral-500 hover:text-indigo-400 transition-colors">View All →</Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-xs text-neutral-600 py-4 text-center">No tasks yet</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className={`w-2 h-2 rounded-full ${
                    t.status === 'done' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-yellow-400' : 'bg-neutral-500'
                  }`} />
                  <span className="text-xs font-medium text-white flex-1 truncate">{t.title}</span>
                  <span className={`text-[10px] font-medium ${
                    t.priority === 'urgent' ? 'text-red-400' : t.priority === 'high' ? 'text-orange-400' : t.priority === 'medium' ? 'text-blue-400' : 'text-neutral-500'
                  }`}>{t.priority}</span>
                  <span className="text-[10px] text-neutral-600">{t.assignee}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Nav */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Access</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/tasks', label: 'Tasks', icon: CheckSquare, color: 'text-indigo-400 bg-indigo-500/10' },
              { href: '/calendar', label: 'Calendar', icon: CalendarDays, color: 'text-green-400 bg-green-500/10' },
              { href: '/team', label: 'Team', icon: Users, color: 'text-purple-400 bg-purple-500/10' },
              { href: '/memory', label: 'Memory', icon: Brain, color: 'text-cyan-400 bg-cyan-500/10' },
              { href: '/content', label: 'Content', icon: Film, color: 'text-orange-400 bg-orange-500/10' },
              { href: '/office', label: 'Office', icon: Building2, color: 'text-yellow-400 bg-yellow-500/10' },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.12] transition-all group">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}>
                  <Icon size={14} />
                </div>
                <span className="text-xs text-neutral-400 group-hover:text-white transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
