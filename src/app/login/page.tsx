'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || status === 'loading') return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const raw = searchParams.get('from') ?? '/';
        // Validate redirect target: must be a relative path (starts with /, not //)
        const from = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
        router.push(from);
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? 'Invalid password');
        setStatus('error');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setErrorMsg('Network error — please try again');
      setStatus('error');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0a0a0f' }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl border border-white/[0.08] p-8"
        style={{ background: '#0c0c14' }}
      >
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold mb-4 shadow-lg shadow-indigo-500/20">
            MC
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Mission Control</h1>
          <p className="text-[12px] text-neutral-500 mt-1 tracking-wide">OPENCLAW FLEET</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-[12px] font-medium text-neutral-400 mb-2">
              Password
            </label>
            <input
              ref={inputRef}
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter dashboard password"
              autoComplete="current-password"
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
              disabled={status === 'loading'}
            />
          </div>

          {/* Error */}
          {status === 'error' && errorMsg && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || status === 'loading'}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
