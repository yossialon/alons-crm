'use client';
import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Spinner from './ui/Spinner';
import { TypePill } from './ui/Badges';

interface MsgLead {
  name: string;
  type: string;
  area: string;
  source?: string;
  notes?: string;
  website?: string;
}

export default function MessageModal({ lead, onClose }: { lead: MsgLead; onClose: () => void }) {
  const [text, setText]     = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `Write a short, warm, professional outreach message (under 90 words) from Alon's Kitchens — a South Florida custom kitchen cabinet and remodeling company (phone: 954-859-9046, alonskitchen.com).

Recipient: ${lead.name}
Type: ${lead.type}
Area: ${lead.area}
Found via: ${lead.source ?? ''}
Details: ${lead.notes ?? ''}
${lead.website ? `Website: ${lead.website}` : ''}

Tailor the message to them. For contractors: emphasize wholesale pricing and reliable supply. For homeowners: emphasize quality and free consultation. For developers: emphasize volume capacity and fast turnaround. No subject line, no bullet points.`,
            }],
          }),
        });
        const data = await res.json();
        if (!cancelled) setText(data.content?.[0]?.text ?? 'Error generating message.');
      } catch {
        if (!cancelled) setText('Error. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [lead]);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal title="AI Outreach Message" subtitle={`To: ${lead.name} · ${lead.area}`} onClose={onClose}>
      <div className="px-6 pb-6 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <TypePill type={lead.type} />
        </div>
        {loading
          ? <Spinner label="Writing personalised message…" />
          : <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed resize-y outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700/50 transition-all"
            />
        }
        <div className="flex gap-3">
          <button
            onClick={copy}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${copied ? 'bg-emerald-600' : 'bg-brand-700 hover:bg-brand-600'}`}
          >
            {copied ? '✅ Copied!' : '📋 Copy Message'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
