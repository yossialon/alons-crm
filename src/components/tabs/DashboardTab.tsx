'use client';
import { useState } from 'react';
import { Lead } from '@/types';
import { StatusBadge, sourceIcon } from '../ui/Badges';
import { MODEL } from '@/lib/constants';
import {
  Users, CalendarPlus, TrendingUp, Package,
  Sparkles, RefreshCw, AlertCircle, Brain,
} from 'lucide-react';

// ── Stats interface ───────────────────────────────────────────────────────────

interface Stats {
  total: number; new: number; qualified: number;
  homeowners: number; contractors: number;
  newThisWeek: number; activePipeline: number; pendingSuppliers: number;
}

// ── Hero stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accentBg, iconBg, iconColor }: {
  label: string; value: number; sub: string;
  icon: React.ReactNode; accentBg: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4 relative overflow-hidden">
      <div className={`absolute left-0 inset-y-0 w-1 rounded-l-2xl ${accentBg}`} />
      <div className="flex-1 pl-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className="text-3xl font-black text-slate-800 leading-none tabular-nums">{value}</p>
        <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
  );
}

// ── AI Briefing section ───────────────────────────────────────────────────────

function BriefingShimmer() {
  return (
    <div className="p-5 space-y-2.5">
      {[90, 75, 100, 60, 85, 50, 70].map((w, i) => (
        <div key={i} className="h-3 rounded-full bg-slate-200 animate-pulse" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function BriefingSection({ leads }: { leads: Lead[] }) {
  const [text, setText]       = useState<string | null>(null);
  const [genTime, setGenTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);

    const potOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const active = leads
      .filter((l) => l.status === 'new' || l.status === 'contacted')
      .sort((a, b) => (potOrder[a.potential] ?? 1) - (potOrder[b.potential] ?? 1))
      .slice(0, 12);
    const qualified = leads.filter((l) => l.status === 'qualified').slice(0, 5);

    const fmt = (l: Lead) =>
      `• ${l.name} | ${l.type} | ${l.area} | ${l.phone || 'no phone'} | Potential: ${l.potential}\n  Source: ${l.source}${l.notes ? ` | "${l.notes.slice(0, 70)}"` : ''}`;

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const prompt = `You are a sales assistant for Alon's Kitchens, a custom kitchen cabinet company in South Florida (954-859-9046, alonskitchen.com). Today is ${today}.

CRM SNAPSHOT:
- Total leads: ${leads.length}
- New (uncontacted): ${leads.filter((l) => l.status === 'new').length}
- Contacted (awaiting follow-up): ${leads.filter((l) => l.status === 'contacted').length}
- Qualified (hot prospects): ${leads.filter((l) => l.status === 'qualified').length}

${active.length > 0 ? `ACTIVE LEADS (by priority):\n${active.map(fmt).join('\n')}` : 'No active leads.'}
${qualified.length > 0 ? `\nQUALIFIED PROSPECTS:\n${qualified.map(fmt).join('\n')}` : ''}

Write a concise daily briefing (under 220 words):
1. One-sentence pipeline summary
2. TOP 3 contacts to call today — name, specific reason, what to say in opening
3. One strategic tip for the day

Be direct, specific, and actionable. No filler.`;

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status} — check that ANTHROPIC_API_KEY is set in .env.local`);
      } else {
        setText(data.content?.[0]?.text ?? 'No response received.');
        setGenTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Brain size={17} className="text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">AI Daily Briefing</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {genTime ? `Generated at ${genTime} · Claude` : 'Powered by Claude · Uses your live CRM data'}
            </p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            text
              ? 'text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200'
              : 'text-white bg-violet-600 hover:bg-violet-500 shadow-sm'
          }`}
        >
          {loading
            ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</>
            : text
              ? <><RefreshCw size={13} /> Regenerate</>
              : <><Sparkles size={13} /> Generate Briefing</>
          }
        </button>
      </div>

      {/* Body */}
      {loading && <BriefingShimmer />}

      {error && !loading && (
        <div className="flex items-start gap-3 p-5 bg-red-50 border-t border-red-100">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {text && !loading && (
        <div className="p-5">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{text}</p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5">
            <Sparkles size={11} className="text-violet-400" />
            <p className="text-[10px] text-slate-400">AI suggestions are a starting point — use your own judgement.</p>
          </div>
        </div>
      )}

      {!text && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
            <Brain size={22} className="text-violet-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">No briefing yet</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Click "Generate Briefing" to get AI-powered call priorities based on your live lead data
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  leads: Lead[];
  stats: Stats;
}

export default function DashboardTab({ leads, stats }: Props) {
  return (
    <div className="space-y-5">

      {/* ── 4 hero stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Leads"
          value={stats.total}
          sub="All time"
          accentBg="bg-indigo-500"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-500"
          icon={<Users size={18} />}
        />
        <StatCard
          label="New This Week"
          value={stats.newThisWeek}
          sub="Last 7 days"
          accentBg="bg-amber-400"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          icon={<CalendarPlus size={18} />}
        />
        <StatCard
          label="Active Pipeline"
          value={stats.activePipeline}
          sub="Contacted + qualified"
          accentBg="bg-emerald-500"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Pending Suppliers"
          value={stats.pendingSuppliers}
          sub="Awaiting response"
          accentBg="bg-orange-400"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          icon={<Package size={18} />}
        />
      </div>

      {/* ── AI Daily Briefing ── */}
      <BriefingSection leads={leads} />

      {/* ── Recent leads + What We Search ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-4">Recent Leads</p>
          {leads.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-5">No leads yet.</p>
          )}
          {leads.slice(0, 6).map((l) => (
            <div key={l.id} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
              <div>
                <p className="font-semibold text-sm text-slate-800">{l.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sourceIcon(l.source)} {l.area}</p>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-4">What We Search</p>
          {[
            ['📍', 'Google Maps',    'Contractor listings with phone, rating, reviews'],
            ['🏡', 'Nextdoor',       'Homeowners asking for remodel recommendations'],
            ['🔴', 'Reddit',         'r/southflorida, r/tampa kitchen remodel posts'],
            ['🏠', 'Houzz',          'Active homeowners planning renovations'],
            ['📋', 'Permit Records', 'Kitchen permits filed in county records'],
            ['💼', 'LinkedIn',       'Developers with active residential projects'],
            ['🔧', 'Angi / BBB',     'Contractors with verified reviews'],
          ].map(([icon, name, desc]) => (
            <div key={name as string} className="flex gap-3 py-2 border-b border-slate-50 last:border-0 items-start">
              <span className="text-base w-5 flex-shrink-0">{icon}</span>
              <div>
                <p className="font-semibold text-xs text-slate-700">{name as string}</p>
                <p className="text-[11px] text-slate-400">{desc as string}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
