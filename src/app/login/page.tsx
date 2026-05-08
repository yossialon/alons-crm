'use client';
import { useState, FormEvent } from 'react';
import { login } from '@/lib/api';

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #E2E8F0',
  borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#0F172A',
  background: '#F8FAFC', outline: 'none',
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      window.location.href = '/dashboard';
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9' }}>
      <div style={{ width: 380, background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 12px 48px rgba(0,0,0,0.12)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🪵</div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: '#D97706', textTransform: 'uppercase', fontWeight: 600 }}>
            Alon&apos;s Kitchens
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1C0A00', marginTop: 4 }}>
            Lead Generation Hub
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inp}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inp}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#E2E8F0' : 'linear-gradient(135deg,#92400E,#D97706)',
              color: loading ? '#94A3B8' : '#fff',
              border: 'none', borderRadius: 8, padding: '12px 0',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit', marginTop: 4,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(146,64,14,0.35)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#CBD5E1' }}>
          Set credentials in <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>.env.local</code>
        </div>
      </div>
    </div>
  );
}
