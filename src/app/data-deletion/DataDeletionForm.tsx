'use client';

import { useState } from 'react';

interface Props {
  /** Present when the user arrives via the Meta status-check URL (?code=...) */
  confirmationCode?: string;
}

export default function DataDeletionForm({ confirmationCode }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Status-check view (Meta sends users here after the callback) ──────────
  if (confirmationCode) {
    return (
      <>
        <div style={{
          background: '#f0faf4',
          border: '1px solid #a3d9b8',
          borderRadius: '6px',
          padding: '28px 32px',
          marginBottom: '32px',
        }}>
          <p style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 12px' }}>
            ✓ Deletion request received
          </p>
          <p style={{ fontSize: '15px', color: '#2a5c3e', margin: '0 0 16px' }}>
            Your request has been logged and will be processed within 30 days.
          </p>
          <p style={{ fontSize: '13px', color: '#4a7c5e', margin: 0 }}>
            Confirmation code:{' '}
            <code style={{ fontFamily: 'monospace', background: '#d8f0e4', padding: '2px 6px', borderRadius: '3px' }}>
              {confirmationCode}
            </code>
          </p>
        </div>
        <p style={{ fontSize: '15px', color: '#555' }}>
          Questions? Email us at{' '}
          <a href="mailto:shimon@alonskitchens.com" style={linkStyle}>
            shimon@alonskitchens.com
          </a>
          {' '}with your confirmation code.
        </p>
      </>
    );
  }

  // ── Human submission form ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Submission failed. Please try again.');
      }

      setStatus('success');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setStatus('error');
    }
  }

  const contactEmail = 'shimon@alonskitchens.com';

  return (
    <>
      <section style={{ marginBottom: '40px', fontSize: '15px', color: '#2a2a2a' }}>
        <p style={{ margin: '0 0 16px' }}>
          Under applicable privacy laws, you have the right to request that we delete
          the personal information we hold about you, including contact details, project
          inquiries, and communication history.
        </p>
        <p style={{ margin: '0 0 16px' }}>
          To submit a deletion request, fill out the form below. You can also email
          us directly at{' '}
          <a href={`mailto:${contactEmail}`} style={linkStyle}>{contactEmail}</a>.
        </p>
        <p style={{ margin: 0 }}>
          Note: some data may be retained for legal or accounting purposes as described
          in our{' '}
          <a href="/privacy" style={linkStyle}>Privacy Policy</a>.
        </p>
      </section>

      {status === 'success' ? (
        <div style={{
          background: '#f0faf4',
          border: '1px solid #a3d9b8',
          borderRadius: '6px',
          padding: '28px 32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 10px' }}>✓ Request submitted</p>
          <p style={{ fontSize: '15px', color: '#2a5c3e', margin: 0 }}>
            We received your data deletion request and will respond to{' '}
            <strong>{email}</strong> within 30 days.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldWrapStyle}>
            <label htmlFor="del-name" style={labelStyle}>Full Name</label>
            <input
              id="del-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              disabled={status === 'submitting'}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapStyle}>
            <label htmlFor="del-email" style={labelStyle}>Email Address</label>
            <input
              id="del-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              disabled={status === 'submitting'}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapStyle}>
            <label htmlFor="del-message" style={labelStyle}>
              Additional details{' '}
              <span style={{ fontWeight: 400, color: '#888', fontSize: '13px' }}>(optional)</span>
            </label>
            <textarea
              id="del-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the data you'd like deleted, or any specific accounts / interactions you're aware of."
              disabled={status === 'submitting'}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '110px' }}
            />
          </div>

          {status === 'error' && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '4px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#7f1d1d',
            }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || !name.trim() || !email.trim()}
            style={{
              background: status === 'submitting' ? '#888' : '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '13px 32px',
              fontSize: '15px',
              fontFamily: 'inherit',
              fontWeight: '600',
              cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
              letterSpacing: '0.03em',
            }}
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit Deletion Request'}
          </button>
        </form>
      )}
    </>
  );
}

const linkStyle: React.CSSProperties = {
  color: '#1a1a1a',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
};

const fieldWrapStyle: React.CSSProperties = {
  marginBottom: '22px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '700',
  marginBottom: '7px',
  letterSpacing: '0.02em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  fontSize: '15px',
  fontFamily: 'inherit',
  border: '1px solid #ccc',
  borderRadius: '4px',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#1a1a1a',
};
