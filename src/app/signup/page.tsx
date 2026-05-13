'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { signup } from '@/lib/api';

export default function SignupPage() {
  const [orgName, setOrgName]   = useState('');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup({ org_name: orgName, name, email, password });
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(msg.includes('409') ? 'Email already in use.' : msg);
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
            <div className="text-center mb-7">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-brand-700 items-center justify-center text-2xl shadow-lg mb-3">
                🪵
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                Start Free Trial
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                14 days free · No credit card required
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Company name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="input"
                  placeholder="Alon's Kitchens"
                  required
                />
              </div>

              <div>
                <label className="label">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Alon Levy"
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <label className="label">Work email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="alon@kitchens.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
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
                className="w-full py-3 mt-1 rounded-xl font-bold text-sm text-white
                           bg-gradient-to-r from-brand-700 to-amber-600
                           hover:from-brand-600 hover:to-amber-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-brand-700/25
                           transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? 'Creating account…' : 'Create Account →'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-4">
              By signing up you agree to our{' '}
              <span className="text-slate-500">Terms of Service</span>.
            </p>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-700 dark:text-amber-500 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {['50 Free Leads', 'AI Discovery', 'Auto-Scan', 'Social Inbox'].map((f) => (
            <span key={f} className="text-[10px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
