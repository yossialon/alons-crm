'use client';
import { useState } from 'react';
import { Lead } from '@/types';
import { Sparkles, RefreshCw, AlertCircle, Phone, Mail, MessageSquare, Users } from 'lucide-react';

interface Insights {
  summary:           string;
  close_probability: number;
  urgency:           'high' | 'medium' | 'low';
  next_action:       string;
  channel:           'phone' | 'email' | 'sms' | 'visit';
  talking_points:    string[];
  follow_up_timing:  string;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  phone: <Phone size={11} />,
  email: <Mail size={11} />,
  sms:   <MessageSquare size={11} />,
  visit: <Users size={11} />,
};

const URGENCY_STYLE: Record<string, string> = {
  high:   'text-red-700 bg-red-50 border-red-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low:    'text-slate-600 bg-slate-50 border-slate-200',
};

function buildPrompt(lead: Lead): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const daysSinceAdded = lead.created_at
    ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86_400_000)
    : null;

  return `You are a sales analyst for Alon's Kitchens, a custom kitchen cabinet company in South Florida (954-859-9046, alonskitchen.com).

Analyze this CRM lead and return ONLY a valid JSON object — no markdown fences, no extra text.

LEAD:
- Name: ${lead.name}
- Type: ${lead.type}
- Status: ${lead.status}
- Area: ${lead.area}
- Source: ${lead.source}
- Potential: ${lead.potential}
- Phone: ${lead.phone || '—'}
- Email: ${lead.email || '—'}
- Rating: ${lead.rating || '—'}
- Notes: ${lead.notes || '—'}
- Added: ${daysSinceAdded !== null ? `${daysSinceAdded} days ago` : '—'}
- Today: ${today}

JSON schema (respond with exactly this shape):
{
  "summary": "<2 sentences: who this lead is and why they matter>",
  "close_probability": <integer 0-100>,
  "urgency": "<high|medium|low>",
  "next_action": "<one specific, concrete action to take>",
  "channel": "<phone|email|sms|visit>",
  "talking_points": ["<point 1>", "<point 2>", "<point 3>"],
  "follow_up_timing": "<e.g. Call Tuesday morning before 10am>"
}`;
}

export default function LeadAIInsights({ lead }: { lead: Lead }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6', // FIXED: upgraded from stale date-versioned ID
          max_tokens: 450,
          messages:   [{ role: 'user', content: buildPrompt(lead) }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in response');
      setInsights(JSON.parse(match[0]) as Insights);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate insights.');
    } finally {
      setLoading(false);
    }
  };

  const prob = insights?.close_probability ?? 0;
  const probColor = prob >= 70 ? 'bg-emerald-500' : prob >= 40 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="px-5 py-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles size={10} className="text-violet-400" /> AI Insights
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors"
        >
          {loading
            ? <><RefreshCw size={10} className="animate-spin" /> Analyzing…</>
            : insights
              ? <><RefreshCw size={10} /> Refresh</>
              : <><Sparkles size={10} /> Generate</>
          }
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Empty prompt */}
      {!insights && !loading && !error && (
        <div className="text-center py-5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-2">
            <Sparkles size={18} className="text-violet-200" />
          </div>
          <p className="text-xs text-slate-400">Click Generate to get AI analysis for this lead</p>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-2 py-1">
          {[85, 65, 90, 70, 55].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-slate-100 animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {/* Results */}
      {insights && !loading && (
        <div className="space-y-3.5">
          {/* Summary */}
          <p className="text-xs text-slate-600 leading-relaxed">{insights.summary}</p>

          {/* Close probability */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${probColor}`}
                style={{ width: `${prob}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700 tabular-nums w-8 text-right">{prob}%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${URGENCY_STYLE[insights.urgency]}`}>
              {insights.urgency}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 -mt-1">Close probability</p>

          {/* Next action */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-violet-500">{CHANNEL_ICON[insights.channel]}</span>
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide">Recommended Action</p>
            </div>
            <p className="text-xs font-semibold text-violet-900 leading-snug">{insights.next_action}</p>
            <p className="text-[10px] text-violet-500 mt-1.5 flex items-center gap-1">
              ⏰ {insights.follow_up_timing}
            </p>
          </div>

          {/* Talking points */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Talking Points</p>
            <ul className="space-y-1.5">
              {insights.talking_points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
                  <span className="text-violet-400 shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
