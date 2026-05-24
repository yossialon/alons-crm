'use client';
import { useState } from 'react';
import {
  Users, CalendarPlus, TrendingUp, Package,
  Sparkles, RefreshCw, AlertCircle, Brain,
  UserPlus, CheckCircle2, ArrowRight, Phone, Star,
} from 'lucide-react';
import { Lead } from '@/types';
import { MODEL } from '@/lib/constants';
import { StatCard, StatusTag, ActivityItem, LeadTag } from '@/components/ui/Primitives';

/* ── Stats ────────────────────────────────────────────────────────────────── */

interface Stats {
  total: number; new: number; qualified: number;
  homeowners: number; contractors: number;
  newThisWeek: number; activePipeline: number; pendingSuppliers: number;
}

/* ── AI Briefing ──────────────────────────────────────────────────────────── */

function BriefingShimmer() {
  return (
    <div className="p-5 space-y-2.5">
      {[90, 75, 100, 60, 85, 50].map((w, i) => (
        <div
          key={i}
          className="skeleton h-3 rounded-full"
          style={{ width: `${w}%` }}
        />
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
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
            <Brain size={15} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-tight">AI Daily Briefing</p>
            <p className="text-[10px] text-muted mt-0.5">
              {genTime ? `Generated at ${genTime} · Claude` : 'Powered by Claude · uses live CRM data'}
            </p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            text
              ? 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800'
              : 'text-white bg-[#7F77DD] hover:bg-[#5F56C8] shadow-sm'
          }`}
        >
          {loading
            ? <><RefreshCw size={12} className="animate-spin" /> Analyzing…</>
            : text
              ? <><RefreshCw size={12} /> Regenerate</>
              : <><Sparkles size={12} /> Generate Briefing</>
          }
        </button>
      </div>

      {loading && <BriefingShimmer />}

      {error && !loading && (
        <div className="flex items-start gap-3 p-5 bg-red-50 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900/30">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {text && !loading && (
        <div className="p-5">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{text}</p>
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5">
            <Sparkles size={10} className="text-purple-400" />
            <p className="text-[10px] text-muted">AI suggestions are a starting point — use your own judgement.</p>
          </div>
        </div>
      )}

      {!text && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-10 h-10 rounded-[10px] bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center mb-3">
            <Brain size={20} className="text-purple-300 dark:text-purple-600" />
          </div>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">No briefing yet</p>
          <p className="text-xs text-muted max-w-xs">
            Click "Generate Briefing" to get AI-powered call priorities based on your live lead data
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Recent leads panel ───────────────────────────────────────────────────── */

function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Recent Leads</p>
        <span className="text-[11px] text-muted">{leads.length} total</span>
      </div>
      {leads.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">No leads yet.</p>
      ) : (
        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
          {leads.slice(0, 6).map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">{l.name}</p>
                <p className="text-[10px] text-muted mt-0.5 truncate">{l.area}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                <LeadTag variant="type" value={l.type} />
                <StatusTag status={l.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Activity Feed panel ──────────────────────────────────────────────────── */

function buildActivity(leads: Lead[]) {
  // Generate activity items from the most recently updated leads
  const sorted = [...leads]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  function relTime(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
    if (diff < 1)   return 'just now';
    if (diff < 60)  return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }

  return sorted.map((l) => {
    if (l.status === 'qualified') {
      return {
        id: l.id,
        icon:  <CheckCircle2 />,
        iconBg: 'bg-brand-50 dark:bg-brand-950/40',
        iconColor: 'text-brand-600 dark:text-brand-400',
        text:  `${l.name} marked as Qualified`,
        meta:  l.area,
        time:  relTime(l.updated_at),
      };
    }
    if (l.status === 'contacted') {
      return {
        id: l.id,
        icon:  <Phone />,
        iconBg: 'bg-amber-50 dark:bg-amber-950/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        text:  `${l.name} contacted`,
        meta:  l.area,
        time:  relTime(l.updated_at),
      };
    }
    if (l.status === 'closed') {
      return {
        id: l.id,
        icon:  <Star />,
        iconBg: 'bg-coral/10 dark:bg-coral/10',
        iconColor: 'text-coral',
        text:  `${l.name} closed`,
        meta:  l.area,
        time:  relTime(l.updated_at),
      };
    }
    // new
    return {
      id: l.id,
      icon:  <UserPlus />,
      iconBg: 'bg-info-50 dark:bg-info-900/30',
      iconColor: 'text-info-600 dark:text-info-400',
      text:  `New lead: ${l.name}`,
      meta:  `${l.type} · ${l.area}`,
      time:  relTime(l.created_at),
    };
  });
}

function ActivityFeed({ leads }: { leads: Lead[] }) {
  const items = buildActivity(leads);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Activity Feed</p>
        <ArrowRight size={14} className="text-zinc-300 dark:text-zinc-600" />
      </div>
      {items.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">No activity yet.</p>
      ) : (
        <div className="px-3 py-2 divide-y divide-zinc-50 dark:divide-zinc-800/60">
          {items.map((item) => (
            <ActivityItem
              key={item.id}
              icon={item.icon}
              iconBg={item.iconBg}
              iconColor={item.iconColor}
              text={item.text}
              meta={item.meta}
              time={item.time}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────────── */

interface Props {
  leads: Lead[];
  stats: Stats;
}

export default function DashboardTab({ leads, stats }: Props) {
  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Leads"
          value={stats.total}
          sub="All time"
          accent="bg-info-500"
          iconBg="bg-info-50 dark:bg-info-900/30"
          iconColor="text-info-600 dark:text-info-400"
          icon={<Users size={16} />}
        />
        <StatCard
          label="New This Week"
          value={stats.newThisWeek}
          sub="Last 7 days"
          accent="bg-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          icon={<CalendarPlus size={16} />}
        />
        <StatCard
          label="Active Pipeline"
          value={stats.activePipeline}
          sub="Contacted + qualified"
          accent="bg-brand-500"
          iconBg="bg-brand-50 dark:bg-brand-950/40"
          iconColor="text-brand-600 dark:text-brand-400"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Pending Suppliers"
          value={stats.pendingSuppliers}
          sub="Awaiting response"
          accent="bg-coral"
          iconBg="bg-coral/10"
          iconColor="text-coral"
          icon={<Package size={16} />}
        />
      </div>

      {/* ── AI Briefing ── */}
      <BriefingSection leads={leads} />

      {/* ── Two-column: Recent Leads + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentLeads leads={leads} />
        <ActivityFeed leads={leads} />
      </div>

    </div>
  );
}
