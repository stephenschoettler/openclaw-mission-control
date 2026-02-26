'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, RotateCcw, Stethoscope, Copy, Check, X, AlertTriangle } from 'lucide-react';

interface ServiceStatus {
  name: string;
  type: string;
  status: string;
  uptime: string;
}

interface SystemStatus {
  systemd: ServiceStatus[];
  docker: ServiceStatus[];
  timestamp: string;
}

function StatusDot({ status }: { status: string }) {
  if (status === 'active' || status === 'running') {
    return <span className="inline-block w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />;
  }
  if (status === 'unknown') {
    return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />;
  }
  return <span className="inline-block w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#f87171]" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active' || status === 'running') {
    return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">{status}</span>;
  }
  if (status === 'unknown') {
    return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{status}</span>;
  }
  return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{status}</span>;
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1f] border border-white/[0.12] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-neutral-200">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function DoctorModal({ output, onClose }: { output: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1f] border border-white/[0.12] rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Stethoscope size={15} className="text-indigo-400" /> Doctor Output
          </h3>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={15} />
          </button>
        </div>
        <pre className="flex-1 overflow-auto text-[11px] font-mono text-green-300 bg-black/40 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
          {output || 'No output'}
        </pre>
      </div>
    </div>
  );
}

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsTs, setLogsTs] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [doctorModal, setDoctorModal] = useState<string | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      setStatus(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
    setStatusLoading(false);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/system/logs');
      const data = await res.json();
      setLogs(data.logs || '');
      setLogsTs(new Date().toLocaleTimeString());
    } catch {}
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    const statusInterval = setInterval(fetchStatus, 10000);
    const logsInterval = setInterval(fetchLogs, 30000);
    return () => { clearInterval(statusInterval); clearInterval(logsInterval); };
  }, [fetchStatus, fetchLogs]);

  const doRestart = async (service: string) => {
    setRestarting(service);
    try {
      await fetch('/api/system/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      if (service === 'mission-control') {
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setTimeout(fetchStatus, 2000);
      }
    } catch {}
    setRestarting(null);
  };

  const askRestart = (service: string, label: string, extra?: string) => {
    setConfirm({
      message: `Restart ${label}?${extra ? ' ' + extra : ''}`,
      action: () => { setConfirm(null); doRestart(service); },
    });
  };

  const runDoctor = async () => {
    setDoctorLoading(true);
    try {
      const res = await fetch('/api/system/doctor');
      const data = await res.json();
      setDoctorModal(data.output || '');
    } catch { setDoctorModal('Failed to run doctor.'); }
    setDoctorLoading(false);
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      {doctorModal !== null && <DoctorModal output={doctorModal} onClose={() => setDoctorModal(null)} />}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold gradient-text">System</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your OpenClaw setup · updated {lastUpdated || '…'}</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => askRestart('gateway', 'OpenClaw Gateway')}
          disabled={restarting === 'gateway'}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#252528] border border-white/[0.08] text-sm font-medium text-neutral-200 hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all disabled:opacity-50"
        >
          <RotateCcw size={14} className={restarting === 'gateway' ? 'animate-spin' : ''} />
          Restart Gateway
        </button>
        <button
          onClick={() => askRestart('mission-control', 'Mission Control', 'The page will reload in ~3 seconds.')}
          disabled={restarting === 'mission-control'}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#252528] border border-white/[0.08] text-sm font-medium text-neutral-200 hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all disabled:opacity-50"
        >
          <RotateCcw size={14} className={restarting === 'mission-control' ? 'animate-spin' : ''} />
          Restart MC
        </button>
        <button
          onClick={runDoctor}
          disabled={doctorLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#252528] border border-white/[0.08] text-sm font-medium text-neutral-200 hover:bg-white/[0.08] hover:border-green-500/30 transition-all disabled:opacity-50"
        >
          <Stethoscope size={14} className={doctorLoading ? 'animate-pulse' : ''} />
          {doctorLoading ? 'Running…' : 'Doctor'}
        </button>
        <button
          onClick={fetchStatus}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#252528] border border-white/[0.08] text-sm font-medium text-neutral-400 hover:bg-white/[0.08] transition-all"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Service Status */}
      <div className="bg-[#252528] rounded-xl border border-white/[0.08] mb-6">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Service Status</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">Auto-refreshes every 10s</p>
        </div>

        {statusLoading ? (
          <div className="px-5 py-8 text-center text-sm text-neutral-500">Loading…</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {/* Systemd Services */}
            {status?.systemd.map(svc => (
              <div key={svc.name} className="flex items-center gap-4 px-5 py-3">
                <StatusDot status={svc.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-100">{svc.name}</p>
                  <p className="text-[11px] text-neutral-600">systemd · {svc.uptime ? `up ${svc.uptime}` : 'no uptime data'}</p>
                </div>
                <StatusBadge status={svc.status} />
                <button
                  onClick={() => askRestart(svc.name === 'openclaw-gateway' ? 'gateway' : 'mission-control', svc.name, svc.name === 'mission-control' ? 'Page will reload.' : '')}
                  disabled={restarting === svc.name}
                  className="p-1.5 rounded-lg text-neutral-600 hover:text-amber-400 hover:bg-amber-500/[0.08] transition-all disabled:opacity-40"
                  title="Restart"
                >
                  <RotateCcw size={13} className={restarting === svc.name ? 'animate-spin' : ''} />
                </button>
              </div>
            ))}

            {/* Docker Containers */}
            {status?.docker.map(svc => (
              <div key={svc.name} className="flex items-center gap-4 px-5 py-3">
                <StatusDot status={svc.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-100">{svc.name}</p>
                  <p className="text-[11px] text-neutral-600">docker · {svc.uptime || 'no uptime data'}</p>
                </div>
                <StatusBadge status={svc.status} />
                <button
                  onClick={() => askRestart(`docker:${svc.name}`, svc.name)}
                  disabled={restarting === `docker:${svc.name}`}
                  className="p-1.5 rounded-lg text-neutral-600 hover:text-amber-400 hover:bg-amber-500/[0.08] transition-all disabled:opacity-40"
                  title="Restart container"
                >
                  <RotateCcw size={13} className={restarting === `docker:${svc.name}` ? 'animate-spin' : ''} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gateway Logs */}
      <div className="bg-[#252528] rounded-xl border border-white/[0.08]">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Gateway Logs</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Last 50 lines · refreshes every 30s{logsTs ? ` · ${logsTs}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchLogs} disabled={logsLoading} className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-40" title="Refresh logs">
              <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={copyLogs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all">
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="p-4">
          {logsLoading && !logs ? (
            <div className="text-center text-sm text-neutral-500 py-4">Loading logs…</div>
          ) : (
            <pre className="text-[11px] font-mono text-neutral-300 bg-black/30 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed">
              {logs || 'No logs available'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
