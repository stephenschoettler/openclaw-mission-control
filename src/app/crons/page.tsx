'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap } from 'lucide-react';

interface CronJob {
  id: string;
  name?: string;
  label?: string;
  schedule: string | { kind: string; expr: string; tz?: string };
  agentId?: string;
  agent?: string;
  enabled?: boolean;
}

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);

  const fetchCrons = useCallback(async () => {
    const res = await fetch('/api/crons');
    setCrons(await res.json());
  }, []);

  useEffect(() => { fetchCrons(); }, [fetchCrons]);
  useEffect(() => { const id = setInterval(fetchCrons, 30000); return () => clearInterval(id); }, [fetchCrons]);

  const active = crons.filter(c => c.enabled !== false);
  const disabled = crons.filter(c => c.enabled === false);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
          <Zap size={16} className="text-orange-400" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Automations</h2>
          <p className="text-xs text-neutral-500">Scheduled cron jobs</p>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-5 px-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-white">{crons.length}</span>
          <span className="text-xs text-neutral-500">Total</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-green-400">{active.length}</span>
          <span className="text-xs text-neutral-500">Active</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-neutral-500">{disabled.length}</span>
          <span className="text-xs text-neutral-500">Disabled</span>
        </div>
      </div>

      {crons.length === 0 ? (
        <div className="card p-12 text-center">
          <Zap size={32} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No cron jobs configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {crons.map(cron => {
            const schedExpr = typeof cron.schedule === 'string' ? cron.schedule : cron.schedule?.expr ?? '';
            const isActive = cron.enabled !== false;
            return (
              <div key={cron.id} className="card card-glow p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-orange-500/15' : 'bg-white/[0.04]'}`}>
                      <Zap size={14} className={isActive ? 'text-orange-400' : 'text-neutral-600'} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[160px]">{cron.name || cron.label || cron.id}</p>
                      <p className="text-[10px] text-neutral-600 font-mono truncate max-w-[160px]">{cron.id}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${isActive ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-neutral-500 bg-white/[0.04] border border-white/[0.06]'}`}>
                    {isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Schedule</span>
                    <span className="text-[11px] text-neutral-300 font-mono">{schedExpr || '—'}</span>
                  </div>
                  {(cron.agentId || cron.agent) && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Agent</span>
                      <span className="text-[11px] text-neutral-400">{cron.agentId || cron.agent}</span>
                    </div>
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
