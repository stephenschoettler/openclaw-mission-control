'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Inbox } from 'lucide-react';

interface Approval {
  id: number;
  title: string;
  type: 'outreach' | 'proposal' | 'code' | 'strategy' | 'other';
  agent: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  outreach:  { label: 'Outreach',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  proposal:  { label: 'Proposal',  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  code:      { label: 'Code',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  strategy:  { label: 'Strategy',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  other:     { label: 'Other',     color: 'text-neutral-400', bg: 'bg-white/[0.06] border-white/[0.1]' },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.other;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

function ApprovalCard({
  approval,
  onApprove,
  onReject,
}: {
  approval: Approval;
  onApprove: (id: number, notes: string) => void;
  onReject: (id: number, notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

  const handleApprove = async () => {
    setActing(true);
    await onApprove(approval.id, notes);
    setActing(false);
  };

  const handleReject = async () => {
    setActing(true);
    await onReject(approval.id, notes);
    setActing(false);
  };

  const preview = approval.content.length > 200 ? approval.content.slice(0, 200) + '…' : approval.content;

  return (
    <div className="card card-glow p-5 border border-white/[0.08]">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <TypeBadge type={approval.type} />
            <span className="text-[10px] text-neutral-500">by {approval.agent}</span>
            <span className="text-[10px] text-neutral-600 ml-auto">{new Date(approval.created_at).toLocaleString()}</span>
          </div>
          <h3 className="text-sm font-bold text-white">{approval.title}</h3>
        </div>
      </div>

      {/* Content preview */}
      <div className="mb-3">
        <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap">
          {expanded ? approval.content : preview}
        </p>
        {approval.content.length > 200 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 mt-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      {/* Notes input */}
      <div className="mb-3">
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes for decision…"
          className="w-full px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white placeholder-neutral-600 outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={acting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-400 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          <CheckCircle size={13} />
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={acting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          <XCircle size={13} />
          Reject
        </button>
      </div>
    </div>
  );
}

function HistoryCard({ approval }: { approval: Approval }) {
  const [expanded, setExpanded] = useState(false);
  const approved = approval.status === 'approved';
  const preview = approval.content.length > 120 ? approval.content.slice(0, 120) + '…' : approval.content;

  return (
    <div className={`card p-4 opacity-70 hover:opacity-90 transition-opacity border ${approved ? 'border-green-500/10' : 'border-red-500/10'}`}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={`text-[10px] font-semibold flex items-center gap-1 ${approved ? 'text-green-400' : 'text-red-400'}`}>
          {approved ? <CheckCircle size={11} /> : <XCircle size={11} />}
          {approved ? 'Approved' : 'Rejected'}
        </span>
        <TypeBadge type={approval.type} />
        <span className="text-[10px] text-neutral-600">by {approval.agent}</span>
        <span className="text-[10px] text-neutral-700 ml-auto">{new Date(approval.updated_at).toLocaleString()}</span>
      </div>
      <p className="text-xs font-semibold text-neutral-300 mb-1">{approval.title}</p>
      <p className="text-[11px] text-neutral-600 whitespace-pre-wrap">
        {expanded ? approval.content : preview}
      </p>
      {approval.content.length > 120 && (
        <button onClick={() => setExpanded(e => !e)} className="text-[11px] text-indigo-500 hover:text-indigo-400 mt-1 transition-colors">
          {expanded ? 'less' : 'more'}
        </button>
      )}
      {approval.notes && (
        <p className="text-[11px] text-neutral-500 mt-2 italic">Notes: {approval.notes}</p>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/approvals');
      const data: Approval[] = await res.json();
      setApprovals(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);
  useEffect(() => {
    const id = setInterval(fetchApprovals, 30000);
    return () => clearInterval(id);
  }, [fetchApprovals]);

  const pending = approvals.filter(a => a.status === 'pending');
  const history = approvals.filter(a => a.status !== 'pending');

  const handleAction = async (id: number, status: 'approved' | 'rejected', notes: string) => {
    await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes: notes || null }),
    });
    fetchApprovals();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <CheckSquare size={16} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold gradient-text tracking-tight">Approval Queue</h2>
            <p className="text-xs text-neutral-500">Items awaiting sign-off before they go out</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-400">{pending.length}</span>
            <span className="text-xs text-neutral-500">Pending</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-neutral-400">{history.length}</span>
            <span className="text-xs text-neutral-500">Resolved</span>
          </div>
        </div>
      </div>

      {/* Pending items */}
      {pending.length === 0 ? (
        <div className="card p-12 text-center mb-6">
          <Inbox size={32} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">All clear — nothing pending approval</p>
          <p className="text-xs text-neutral-600 mt-1">Agents can submit requests via POST /api/approvals</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Pending ({pending.length})
            </span>
          </div>
          {pending.map(a => (
            <ApprovalCard
              key={a.id}
              approval={a}
              onApprove={(id, notes) => handleAction(id, 'approved', notes)}
              onReject={(id, notes) => handleAction(id, 'rejected', notes)}
            />
          ))}
        </div>
      )}

      {/* History section */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-3 group"
          >
            {historyOpen ? <ChevronUp size={14} className="group-hover:text-indigo-400" /> : <ChevronDown size={14} className="group-hover:text-indigo-400" />}
            <span className="font-semibold uppercase tracking-wider">History ({history.length})</span>
          </button>
          {historyOpen && (
            <div className="space-y-3">
              {history.map(a => <HistoryCard key={a.id} approval={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
