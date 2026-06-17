'use client';
import { useState } from 'react';
import { Lead } from '@/types';
import { Users, PhoneCall, Target, TrendingUp, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface Props { leads: Lead[] }

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-5 text-right tabular-nums">{value}</span>
    </div>
  );
}

export default function AnalyticsTab({ leads }: Props) {
  const total = leads.length;

  const byStatus = {
    new:       leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    closed:    leads.filter((l) => l.status === 'closed').length,
  };

  const contactRate = total > 0 ? Math.round(((byStatus.contacted + byStatus.qualified + byStatus.closed) / total) * 100) : 0;
  const qualRate    = total > 0 ? Math.round((byStatus.qualified / total) * 100) : 0;

  // Top sources
  const bySource: Record<string, number> = {};
  leads.forEach((l) => { bySource[l.source] = (bySource[l.source] || 0) + 1; });
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Top areas
  const byArea: Record<string, number> = {};
  leads.forEach((l) => { byArea[l.area] = (byArea[l.area] || 0) + 1; });
  const topAreas = Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // By type
  const byType = {
    Homeowner:  leads.filter((l) => l.type === 'Homeowner').length,
    Contractor: leads.filter((l) => l.type === 'Contractor').length,
    Developer:  leads.filter((l) => l.type === 'Developer').length,
  };

  // Monthly trend (last 6 months)
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      count: leads.filter((l) => {
        const ld = new Date(l.created_at);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      }).length,
    };
  });
  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);
  const maxSource  = Math.max(...topSources.map((s) => s[1]), 1);
  const maxArea    = Math.max(...topAreas.map((a) => a[1]), 1);
  const maxType    = Math.max(...Object.values(byType), 1);

  // AI pipeline predictions state
  const [aiText,     setAiText]     = useState<string | null>(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState<string | null>(null);
  const [aiGenTime,  setAiGenTime]  = useState<string | null>(null);

  const generatePredictions = async () => {
    if (total === 0) return;
    setAiLoading(true);
    setAiError(null);

    const topByPotential = leads
      .filter((l) => l.status !== 'closed')
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (order[a.potential] ?? 1) - (order[b.potential] ?? 1);
      })
      .slice(0, 8)
      .map((l) => `• ${l.name} | ${l.type} | ${l.area} | ${l.status} | ${l.potential} potential${l.notes ? ` | "${l.notes.slice(0, 60)}"` : ''}`)
      .join('\n');

    const stale = leads
      .filter((l) => l.status === 'contacted' && l.created_at)
      .filter((l) => Date.now() - new Date(l.created_at).getTime() > 14 * 86_400_000)
      .slice(0, 5)
      .map((l) => `• ${l.name} (${l.area})`)
      .join('\n');

    const prompt = `You are a sales analyst for Alon's Kitchens, South Florida custom kitchen cabinets.

PIPELINE SNAPSHOT:
- Total leads: ${total}
- New: ${byStatus.new} | Contacted: ${byStatus.contacted} | Qualified: ${byStatus.qualified} | Closed: ${byStatus.closed}
- Contact rate: ${contactRate}% | Qualify rate: ${qualRate}%

TOP PROSPECTS:
${topByPotential || 'none'}

STALE (contacted >14 days):
${stale || 'none'}

Write a concise pipeline health report (under 200 words):
1. One-sentence health assessment
2. Top 3 leads most likely to close this month — and why
3. At-risk leads that need immediate attention
4. One strategic recommendation

Be specific, direct, actionable. Reference real lead names where possible.`;

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6', // FIXED: upgraded from stale date-versioned ID
          max_tokens: 450,
          messages:   [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setAiText(data.content?.[0]?.text ?? 'No response.');
      setAiGenTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to generate predictions.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads',   value: total,             icon: <Users size={16} />,     color: 'bg-indigo-500', ib: 'bg-indigo-50',   ic: 'text-indigo-500' },
          { label: 'Contact Rate',  value: `${contactRate}%`, icon: <PhoneCall size={16} />, color: 'bg-amber-400',  ib: 'bg-amber-50',    ic: 'text-amber-500' },
          { label: 'Qualify Rate',  value: `${qualRate}%`,    icon: <Target size={16} />,    color: 'bg-emerald-500',ib: 'bg-emerald-50',  ic: 'text-emerald-600' },
          { label: 'Closed',        value: byStatus.closed,   icon: <TrendingUp size={16} />,color: 'bg-violet-500', ib: 'bg-violet-50',   ic: 'text-violet-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 relative overflow-hidden">
            <div className={`absolute left-0 inset-y-0 w-1 rounded-l-2xl ${kpi.color}`} />
            <div className="flex-1 pl-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{kpi.label}</p>
              <p className="text-2xl font-black text-slate-800 tabular-nums">{kpi.value}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl ${kpi.ib} flex items-center justify-center shrink-0`}>
              <span className={kpi.ic}>{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Funnel + Monthly bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-4">Pipeline Funnel</p>
          <div className="space-y-3">
            {[
              { label: 'New',       value: byStatus.new,       color: 'bg-blue-400' },
              { label: 'Contacted', value: byStatus.contacted, color: 'bg-amber-400' },
              { label: 'Qualified', value: byStatus.qualified, color: 'bg-emerald-500' },
              { label: 'Closed',    value: byStatus.closed,    color: 'bg-violet-500' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                  </span>
                </div>
                <HBar value={s.value} max={total} color={s.color} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-4">Monthly New Leads</p>
          <div className="flex items-end gap-1.5 h-28 mt-2">
            {monthly.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">{m.count || ''}</span>
                <div
                  className="w-full rounded-t-md bg-amber-600/20 overflow-hidden"
                  style={{ height: `${Math.max((m.count / maxMonthly) * 72, m.count > 0 ? 6 : 2)}px` }}
                >
                  <div className="h-full w-full bg-amber-600/70 rounded-t-md" />
                </div>
                <span className="text-[9px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source + Area + Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-4">Top Sources</p>
          <div className="space-y-2.5">
            {topSources.map(([src, count]) => (
              <div key={src}>
                <p className="text-xs text-slate-500 mb-0.5 truncate">{src}</p>
                <HBar value={count} max={maxSource} color="bg-indigo-400" />
              </div>
            ))}
            {topSources.length === 0 && <p className="text-xs text-slate-400">No data yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-4">Top Areas</p>
          <div className="space-y-2.5">
            {topAreas.map(([area, count]) => (
              <div key={area}>
                <p className="text-xs text-slate-500 mb-0.5 truncate">{area}</p>
                <HBar value={count} max={maxArea} color="bg-emerald-400" />
              </div>
            ))}
            {topAreas.length === 0 && <p className="text-xs text-slate-400">No data yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="font-bold text-sm text-slate-800 mb-4">Lead Types</p>
          <div className="space-y-2.5">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type}>
                <p className="text-xs text-slate-500 mb-0.5">{type}</p>
                <HBar value={count} max={maxType} color="bg-amber-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Pipeline Predictions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">AI Pipeline Predictions</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {aiGenTime ? `Generated at ${aiGenTime}` : 'Analyzes your leads and predicts outcomes'}
              </p>
            </div>
          </div>
          <button
            onClick={generatePredictions}
            disabled={aiLoading || total === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              aiText
                ? 'text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200'
                : 'text-white bg-violet-600 hover:bg-violet-500 shadow-sm'
            }`}
          >
            {aiLoading
              ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</>
              : aiText
                ? <><RefreshCw size={13} /> Refresh</>
                : <><Sparkles size={13} /> Generate</>
            }
          </button>
        </div>

        {aiError && (
          <div className="flex items-center gap-2 p-5 text-sm text-red-600 bg-red-50 border-t border-red-100">
            <AlertCircle size={14} className="shrink-0" />
            {aiError}
          </div>
        )}

        {aiLoading && (
          <div className="p-5 space-y-2.5">
            {[90, 75, 85, 60, 70, 50].map((w, i) => (
              <div key={i} className="h-2.5 rounded-full bg-slate-100 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {aiText && !aiLoading && (
          <div className="p-5">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiText}</p>
            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1">
              <Sparkles size={10} className="text-violet-300" />
              AI predictions are estimates — verify with your own judgement.
            </p>
          </div>
        )}

        {!aiText && !aiLoading && !aiError && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
              <Sparkles size={22} className="text-violet-200" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No analysis yet</p>
            <p className="text-xs text-slate-400 max-w-xs">
              {total === 0 ? 'Add some leads first to enable AI predictions.' : 'Click Generate to get AI-powered pipeline health analysis and win predictions.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
