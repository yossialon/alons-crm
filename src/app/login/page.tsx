'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error();
      window.location.href = '/dashboard';
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-700/10 dark:bg-brand-700/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl dark:shadow-black/40 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-brand-600 to-brand-700" />

          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-brand-700 items-center justify-center text-3xl shadow-lg mb-4">
                🪵
              </div>
              <p className="text-[10px] tracking-[0.25em] text-amber-600 dark:text-amber-500 uppercase font-semibold mb-1">
                Alon&apos;s Kitchens
              </p>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                Lead Generation Hub
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                South Florida Custom Kitchens
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="YossiAlon"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-brand-700 dark:text-amber-500 font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 rounded-xl font-bold text-sm text-white
                           bg-gradient-to-r from-brand-700 to-amber-600
                           hover:from-brand-600 hover:to-amber-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-brand-700/25 hover:shadow-brand-600/30
                           transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 mt-6">
              Credentials set in{' '}
              <code className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                .env.local
              </code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {['AI Lead Discovery', 'Auto-Scan', 'Social Inbox', 'Outreach'].map((f) => (
            <span key={f} className="text-[10px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
