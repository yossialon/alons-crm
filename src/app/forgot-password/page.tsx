'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
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
            {sent ? (
              <div className="text-center">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 items-center justify-center text-3xl mb-4">
                  ✉️
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mb-2">
                  Check your email
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  If <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span> has an account,
                  we&apos;ve sent a reset link. It expires in 1 hour.
                </p>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-brand-700 dark:text-amber-500 hover:underline"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-7">
                  <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-brand-700 items-center justify-center text-2xl shadow-lg mb-3">
                    🔑
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                    Forgot password?
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Enter your email and we&apos;ll send a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="you@example.com"
                      autoComplete="email"
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
                    className="w-full py-3 rounded-xl font-bold text-sm text-white
                               bg-gradient-to-r from-brand-700 to-amber-600
                               hover:from-brand-600 hover:to-amber-500
                               disabled:opacity-50 disabled:cursor-not-allowed
                               shadow-lg shadow-brand-700/25
                               transition-all duration-200 active:scale-[0.98]"
                  >
                    {loading ? 'Sending…' : 'Send Reset Link →'}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                  <Link href="/login" className="text-brand-700 dark:text-amber-500 font-semibold hover:underline">
                    ← Back to sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
