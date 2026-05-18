'use client';
import { useState, useRef } from 'react';
import { callClaude } from '@/lib/api';
import { buildAuditPrompt, AREAS } from '@/lib/constants';
import { ClipboardList, Play, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let key = 0;

  const flushTable = () => {
    if (tableRows.length < 2) { tableRows = []; inTable = false; return; }
    const [header, , ...body] = tableRows;
    nodes.push(
      <div key={key++} className="overflow-x-auto my-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {header.map((h, i) => (
                <th key={i} className="border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-slate-200 px-2 py-1.5 text-slate-700 max-w-[200px]">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = []; inTable = false;
  };

  for (const line of lines) {
    if (line.startsWith('|')) {
      inTable = true;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (!cells.every((c) => /^[-:\s]+$/.test(c))) tableRows.push(cells);
      continue;
    }
    if (inTable) flushTable();

    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={key++} className="text-base font-bold text-slate-800 mt-6 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      nodes.push(<h3 key={key++} className="text-sm font-bold text-slate-700 mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      nodes.push(<p key={key++} className="text-sm font-semibold text-slate-800 mt-3 mb-1">{line.slice(2, -2)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2);
      const colored = content
        .replace(/✅/g, '<span class="text-emerald-600">✅</span>')
        .replace(/⚠️/g, '<span class="text-amber-500">⚠️</span>')
        .replace(/❌/g, '<span class="text-red-500">❌</span>')
        .replace(/🔴/g, '<span class="text-red-500">🔴</span>')
        .replace(/🟡/g, '<span class="text-amber-500">🟡</span>')
        .replace(/🟢/g, '<span class="text-emerald-500">🟢</span>');
      nodes.push(
        <div key={key++} className="flex gap-2 text-sm text-slate-700 py-0.5">
          <span className="text-slate-400 shrink-0 mt-0.5">•</span>
          <span dangerouslySetInnerHTML={{ __html: colored }} />
        </div>
      );
    } else if (/^\d+\./.test(line)) {
      const content = line.replace(/^\d+\.\s*/, '');
      nodes.push(
        <div key={key++} className="flex gap-2 text-sm text-slate-700 py-0.5">
          <span className="text-brand-700 font-bold shrink-0">{line.match(/^\d+/)?.[0]}.</span>
          <span>{content}</span>
        </div>
      );
    } else if (line.startsWith('---')) {
      nodes.push(<hr key={key++} className="border-slate-200 my-4" />);
    } else if (line.trim()) {
      const colored = line
        .replace(/✅/g, '<span class="text-emerald-600">✅</span>')
        .replace(/⚠️/g, '<span class="text-amber-500">⚠️</span>')
        .replace(/❌/g, '<span class="text-red-500">❌</span>')
        .replace(/🔴/g, '<span class="text-red-500">🔴</span>')
        .replace(/🟡/g, '<span class="text-amber-500">🟡</span>')
        .replace(/🟢/g, '<span class="text-emerald-500">🟢</span>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      nodes.push(<p key={key++} className="text-sm text-slate-700 my-0.5" dangerouslySetInnerHTML={{ __html: colored }} />);
    } else {
      nodes.push(<div key={key++} className="h-2" />);
    }
  }
  if (inTable) flushTable();
  return nodes;
}

// ── Phase progress display ────────────────────────────────────────────────────

const PHASES = [
  { label: 'Auditing lead channels',   desc: 'Checking social, directory & inbound sources…' },
  { label: 'Searching for live leads', desc: 'Scanning posts from the last 30 days…' },
  { label: 'Checking online presence', desc: 'Looking up Alon\'s Kitchens on Google, Houzz, Yelp…' },
  { label: 'Generating report',        desc: 'Ranking leads and building recommendations…' },
];

// ── Config panel ──────────────────────────────────────────────────────────────

function ConfigPanel({
  city, setCity, services, setServices, budget, setBudget,
}: {
  city: string; setCity: (v: string) => void;
  services: string; setServices: (v: string) => void;
  budget: string; setBudget: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>Audit Settings — {city} · {services}</span>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100">
          <div>
            <label className="label">City / Region</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input">
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Services offered</label>
            <input
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className="input"
              placeholder="Custom kitchen cabinets, remodeling"
            />
          </div>
          <div>
            <label className="label">Monthly lead budget</label>
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="input"
              placeholder="$500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function LeadAuditTab() {
  const [city,     setCity]     = useState('Boca Raton');
  const [services, setServices] = useState('Custom kitchen cabinets & remodeling');
  const [budget,   setBudget]   = useState('$500');
  const [loading,  setLoading]  = useState(false);
  const [phase,    setPhase]    = useState(0);
  const [result,   setResult]   = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const runAudit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setPhase(0);

    // Step through phases visually while Claude works
    const phaseTimer = setInterval(() => {
      setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p));
    }, 18_000);

    try {
      const prompt = buildAuditPrompt(city, services, budget);
      const text = await callClaude(prompt);
      setResult(text);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed. Check API key and credits.');
    } finally {
      clearInterval(phaseTimer);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Lead Channel Audit</h2>
              <p className="text-xs text-slate-400">4-phase AI audit · finds active leads + grades every channel</p>
            </div>
          </div>
          <button
            onClick={runAudit}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              loading
                ? 'bg-slate-100 text-slate-400 cursor-default'
                : 'bg-brand-700 text-white hover:bg-brand-600 shadow-brand-700/25'
            }`}
          >
            {loading
              ? <><RefreshCw size={14} className="animate-spin" /> Running…</>
              : <><Play size={14} /> Run Full Audit</>
            }
          </button>
        </div>
      </div>

      {/* ── Config ── */}
      <ConfigPanel
        city={city} setCity={setCity}
        services={services} setServices={setServices}
        budget={budget} setBudget={setBudget}
      />

      {/* ── Progress ── */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Audit in progress</p>
          <div className="space-y-3">
            {PHASES.map((p, i) => {
              const done    = i < phase;
              const active  = i === phase;
              const pending = i > phase;
              return (
                <div key={i} className={`flex items-start gap-3 transition-opacity ${pending ? 'opacity-30' : 'opacity-100'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                    done   ? 'bg-emerald-100 text-emerald-700' :
                    active ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300 ring-offset-1' :
                             'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-slate-800' : 'text-slate-500'}`}>{p.label}</p>
                    {active && <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">
          <strong>Audit failed:</strong> {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && !loading && (
        <div ref={resultRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Audit Results — {city}</p>
            <button
              onClick={runAudit}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RefreshCw size={12} /> Re-run
            </button>
          </div>
          <div className="space-y-0.5">
            {renderMarkdown(result)}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !result && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Ready to audit your lead channels</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Claude will search the web across 10+ channels, find live leads in your area, check your online presence, and give a ranked action plan.
          </p>
          <button
            onClick={runAudit}
            className="mt-5 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-700 text-white hover:bg-brand-600 shadow-sm shadow-brand-700/25 transition-colors"
          >
            <Play size={14} /> Run Full Audit
          </button>
        </div>
      )}
    </div>
  );
}
