'use client';

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, CheckSquare, CalendarDays, Brain, Users, Film, Building2, Zap, Inbox, Activity, Send, Monitor, DollarSign } from "lucide-react";

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/sessions', label: 'Sessions', icon: Monitor },
  { href: '/crons', label: 'Crons', icon: Zap },
  { href: '/costs', label: 'Costs', icon: DollarSign },
  { href: '/approvals', label: 'Approvals', icon: Inbox },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/office', label: 'Office', icon: Building2 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/content', label: 'Content', icon: Film },
];

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <p className="text-[11px] text-neutral-400 font-mono pl-4 mb-1">{time}</p>;
}

function PingBabbage() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/ping-babbage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        setStatus('sent');
        setMessage('');
        setTimeout(() => { setStatus('idle'); setOpen(false); }, 2000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="px-3 mb-2">
      {open && (
        <div className="mb-2 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] animate-in fade-in slide-in-from-bottom-2 duration-150">
          {status === 'sent' ? (
            <p className="text-[12px] text-green-400 text-center font-medium py-1">✓ Sent</p>
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(); if (e.key === 'Escape') { setOpen(false); setMessage(''); } }}
                placeholder="Message to Babbage..."
                className="w-full bg-transparent text-[12px] text-white placeholder:text-neutral-600 focus:outline-none"
                disabled={status === 'sending'}
              />
              <div className="flex items-center justify-between mt-2">
                {status === 'error' && <span className="text-[10px] text-red-400">Failed to send</span>}
                {status !== 'error' && <span className="text-[10px] text-neutral-600">Enter to send · Esc to close</span>}
                <button
                  onClick={send}
                  disabled={!message.trim() || status === 'sending'}
                  className="ml-auto flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={11} />
                  {status === 'sending' ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => { setOpen(o => !o); setStatus('idle'); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
      >
        🤖 <span>Ping Babbage</span>
      </button>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [latestActivityId, setLatestActivityId] = useState(0);
  const [seenActivityId, setSeenActivityId] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/approvals?status=pending');
        const data: unknown[] = await res.json();
        setPendingApprovals(Array.isArray(data) ? data.length : 0);
      } catch {
        // silently fail
      }
    };
    fetchPending();
    const id = setInterval(fetchPending, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchLatestActivity = async () => {
      try {
        const res = await fetch('/api/activity');
        const data: { id: number }[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLatestActivityId(data[0].id);
        }
      } catch {
        // silently fail
      }
    };
    fetchLatestActivity();
    const id = setInterval(fetchLatestActivity, 10000);
    return () => clearInterval(id);
  }, []);

  // Mark activity as seen when navigating to /activity
  useEffect(() => {
    if (pathname === '/activity') {
      setSeenActivityId(latestActivityId);
    }
  }, [pathname, latestActivityId]);

  const hasNewActivity = latestActivityId > seenActivityId && seenActivityId > 0;

  return (
    <html lang="en">
      <head>
        <title>Mission Control</title>
        <meta name="description" content="OpenClaw Fleet Dashboard" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-[200px] flex-shrink-0 border-r border-white/[0.06] bg-[#0c0c14] flex flex-col">
            <Link href="/" className="block px-5 pt-5 pb-4 group">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  MC
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white tracking-tight">Mission Control</h1>
                  <p className="text-[10px] text-neutral-500 tracking-wide">OPENCLAW FLEET</p>
                </div>
              </div>
            </Link>
            <nav className="flex-1 px-3 space-y-0.5 mt-1 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                const isApprovals = href === '/approvals';
                const isActivity = href === '/activity';
                const showApprovalsBadge = isApprovals && pendingApprovals > 0;
                const showActivityDot = isActivity && hasNewActivity;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? 'bg-indigo-500/[0.15] text-white border border-indigo-500/20'
                        : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <Icon size={15} className={active ? 'text-indigo-300' : 'text-neutral-600'} />
                    {label}
                    {showApprovalsBadge ? (
                      <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                        {pendingApprovals > 99 ? '99+' : pendingApprovals}
                      </span>
                    ) : showActivityDot ? (
                      <span className="ml-auto w-2 h-2 rounded-full bg-indigo-400 pulse-dot" />
                    ) : (
                      active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/[0.06]">
              <PingBabbage />
              <div className="px-4 pb-4 pt-2">
                <LiveClock />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
                  <p className="text-[11px] text-neutral-400">System Online</p>
                </div>
                <p className="text-[10px] text-neutral-600 mt-1.5 pl-4">localhost:3001</p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6 dot-grid">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
