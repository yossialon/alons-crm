'use client';
import { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import Spinner from './ui/Spinner';
import { TypePill } from './ui/Badges';
import { Mail, MessageSquare, Phone, RefreshCw } from 'lucide-react';

interface MsgLead {
  name:    string;
  type:    string;
  area:    string;
  source?: string;
  notes?:  string;
  website?: string;
  phone?:  string;
  email?:  string;
}

type Channel = 'email' | 'sms' | 'whatsapp' | 'call_script';

const CHANNELS: { id: Channel; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'email',       label: 'Email',       icon: <Mail size={13} />,          hint: 'Formal, 3–4 short paragraphs' },
  { id: 'sms',         label: 'SMS',         icon: <MessageSquare size={13} />, hint: 'Under 160 chars, direct' },
  { id: 'whatsapp',    label: 'WhatsApp',    icon: '💬',                         hint: 'Casual, can include emoji' },
  { id: 'call_script', label: 'Call Script', icon: <Phone size={13} />,         hint: 'Bullet points for the call' },
];

function buildPrompt(lead: MsgLead, channel: Channel): string {
  const base = `You are writing on behalf of Alon's Kitchens — a South Florida custom kitchen cabinet and remodeling company (phone: 954-859-9046, alonskitchen.com).

Recipient: ${lead.name}
Lead type: ${lead.type}
Area: ${lead.area}
Found via: ${lead.source ?? '—'}
Notes: ${lead.notes ?? '—'}
${lead.website ? `Website: ${lead.website}` : ''}

Type-specific angle:
- Homeowner → quality craftsmanship, free in-home consultation, custom design
- Contractor → wholesale pricing, reliable supply, fast turnaround, trade discounts
- Developer → volume capacity, consistent quality at scale, tight timelines`;

  switch (channel) {
    case 'email':
      return `${base}

Write a professional cold outreach EMAIL (no subject line needed, 3–4 short paragraphs, under 150 words). Personalize based on their type. End with a clear CTA to call or book a consultation. No bullet points, no generic filler.`;

    case 'sms':
      return `${base}

Write a SHORT SMS message (strictly under 160 characters, including spaces). Be direct, warm, and include the phone number 954-859-9046. No links unless absolutely needed. Just the message text, nothing else.`;

    case 'whatsapp':
      return `${base}

Write a WhatsApp message (casual and warm, under 100 words, 1–2 short paragraphs). Can include 1–2 relevant emojis. Friendly but professional. Include the phone number at the end. Just the message text, nothing else.`;

    case 'call_script':
      return `${base}

Write a call script with these sections (use plain text, no markdown):
OPENING (2 sentences — introduce yourself and the reason for calling)
KEY POINTS (3 bullet points — value props tailored to their type)
QUESTIONS TO ASK (2 discovery questions)
CLOSE (1 sentence — propose a next step)`;
  }
}

export default function MessageModal({ lead, onClose }: { lead: MsgLead; onClose: () => void }) {
  const [channel,  setChannel]  = useState<Channel>('email');
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const generate = useCallback(async (ch: Channel) => {
    setLoading(true);
    setError(null);
    setText('');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-5-20250929',
          max_tokens: ch === 'sms' ? 100 : ch === 'call_script' ? 500 : 350,
          messages:   [{ role: 'user', content: buildPrompt(lead, ch) }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setText(data.content?.[0]?.text ?? 'No response.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lead]);

  // Auto-generate on first open
  useEffect(() => { generate('email'); }, [generate]);

  const handleChannelChange = (ch: Channel) => {
    setChannel(ch);
    generate(ch);
  };

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentChannel = CHANNELS.find((c) => c.id === channel)!;

  return (
    <Modal title="AI Outreach Message" subtitle={`To: ${lead.name} · ${lead.area}`} onClose={onClose}>
      <div className="px-6 pb-6 pt-3 space-y-4">
        {/* Lead type badge */}
        <div className="flex items-center gap-2">
          <TypePill type={lead.type} />
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => handleChannelChange(ch.id)}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 ${
                channel === ch.id
                  ? 'bg-white shadow-sm text-slate-800 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-1">
                {ch.icon}
                <span className="hidden sm:inline">{ch.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Channel hint */}
        <p className="text-[11px] text-slate-400 -mt-1">{currentChannel.hint}</p>

        {/* Message area */}
        {loading ? (
          <Spinner label={`Writing ${currentChannel.label.toLowerCase()}…`} />
        ) : error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            {error}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={channel === 'call_script' ? 9 : 7}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed resize-y outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700/50 transition-all font-mono"
          />
        )}

        {/* Character count for SMS */}
        {channel === 'sms' && text && !loading && (
          <p className={`text-[11px] text-right -mt-2 ${text.length > 160 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
            {text.length} / 160 chars
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={copy}
            disabled={loading || !text}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${copied ? 'bg-emerald-600' : 'bg-brand-700 hover:bg-brand-600'}`}
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={() => generate(channel)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Redo
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
