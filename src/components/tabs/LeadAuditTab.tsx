'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { callClaude } from '@/lib/api';
import { buildAuditPrompt, AREAS } from '@/lib/constants';
import {
  ClipboardList, Play, RefreshCw, ChevronDown, ChevronUp,
  Users, Bell, Star, Calendar, Copy, Check, ExternalLink,
} from 'lucide-react';

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
        <h2 key={key++} className="text-base font-bold text-slate-800 mt-6 mb-2 pb-1 border-b border-slate-200">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      nodes.push(<h3 key={key++} className="text-sm font-bold text-slate-700 mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      nodes.push(<p key={key++} className="text-sm font-semibold text-slate-800 mt-3 mb-1">{line.slice(2, -2)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const colored = line.slice(2)
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
      nodes.push(
        <div key={key++} className="flex gap-2 text-sm text-slate-700 py-0.5">
          <span className="text-brand-700 font-bold shrink-0">{line.match(/^\d+/)?.[0]}.</span>
          <span>{line.replace(/^\d+\.\s*/, '')}</span>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Facebook Groups panel ─────────────────────────────────────────────────────

const GROUPS = [
  { name: 'Ask Boca',                      url: 'https://www.facebook.com/groups/AskBoca/',                        area: 'Boca Raton' },
  { name: 'Florida Home Owners Remodel',   url: 'https://www.facebook.com/groups/Floridahomeowners/',              area: 'South FL' },
  { name: 'Kitchen Renovation & Design',   url: 'https://www.facebook.com/groups/kitchenrenodesignideas/',         area: 'General' },
  { name: 'Fort Lauderdale Neighbors',     url: 'https://www.facebook.com/groups/fortlauderdalefl/',               area: 'Fort Lauderdale' },
  { name: 'Boca Raton Community',          url: 'https://www.facebook.com/groups/bocaratoncommunity/',             area: 'Boca Raton' },
  { name: 'South Florida Homeowners',      url: 'https://www.facebook.com/groups/southfloridahomeowners/',         area: 'South FL' },
];

const GROUPS_KEY = 'alons_group_checks';

function FacebookGroupsPanel() {
  const [checks, setChecks] = useState<Record<string, number>>({});

  useEffect(() => {
    try { setChecks(JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '{}')); } catch {}
  }, []);

  const markChecked = useCallback((name: string) => {
    const next = { ...checks, [name]: Date.now() };
    setChecks(next);
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch {}
  }, [checks]);

  const staleDays = 1;
  const isStale = (name: string) => {
    const ts = checks[name];
    return !ts || Date.now() - ts > staleDays * 86_400_000;
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Check each group for new posts: "looking for contractor", "need kitchen quote", "anyone know a good remodeler". Mark after checking so you know what's fresh.</p>
      <div className="space-y-1.5">
        {GROUPS.map((g) => {
          const stale = isStale(g.name);
          const ts    = checks[g.name];
          return (
            <div key={g.name} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${stale ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${stale ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{g.name}</p>
                <p className="text-[11px] text-slate-400">{g.area} · {ts ? `Checked ${timeAgo(ts)}` : 'Never checked'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={g.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-700 hover:underline font-semibold">
                  Open <ExternalLink size={11} />
                </a>
                <button
                  onClick={() => markChecked(g.name)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors font-semibold"
                >
                  ✓ Checked
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Google Alerts panel ───────────────────────────────────────────────────────

const ALERTS = [
  '"kitchen cabinet" "Boca Raton"',
  '"kitchen remodel" "Fort Lauderdale"',
  '"custom cabinets" "South Florida"',
  '"kitchen contractor" "West Palm Beach"',
  '"cabinet installer" "Miami"',
];

function GoogleAlertsPanel() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Google will email you every time these phrases appear in new web content — blog posts, news, forum posts, etc.
        <a href="https://alerts.google.com" target="_blank" rel="noreferrer" className="ml-1 text-brand-700 font-semibold hover:underline inline-flex items-center gap-0.5">
          Open Google Alerts <ExternalLink size={10} />
        </a>
        , then paste each term below into the search box and click &quot;Create Alert&quot;.
      </p>
      <div className="space-y-1.5">
        {ALERTS.map((alert) => (
          <div key={alert} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <code className="text-xs text-slate-700 font-mono">{alert}</code>
            <CopyButton text={alert} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Review Request panel ──────────────────────────────────────────────────────

const REVIEW_LINK_KEY = 'alons_review_link';

const REVIEW_TEMPLATE = (link: string) =>
`Hi, it's Alon from Alon's Kitchens! 🏠

Thank you so much for choosing us for your kitchen project — it was a pleasure working with you.

If you're happy with how everything turned out, would you mind leaving us a quick Google review? It only takes a minute and helps other homeowners find us.

👉 ${link || '[paste your Google review link here]'}

Thank you! — Alon`;

function ReviewRequestPanel() {
  const [link, setLink] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { setLink(localStorage.getItem(REVIEW_LINK_KEY) ?? ''); } catch {}
  }, []);

  const saveLink = () => {
    try { localStorage.setItem(REVIEW_LINK_KEY, link); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const template = REVIEW_TEMPLATE(link);

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Your Google Review link</label>
        <p className="text-xs text-slate-400 mb-2">
          Go to your Google Business profile → click <strong>"Get more reviews"</strong> → copy the link and paste it here.
        </p>
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://g.page/r/..."
            className="input flex-1"
          />
          <button
            onClick={saveLink}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-700 text-white hover:bg-brand-600 transition-colors shrink-0"
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">WhatsApp / SMS template</label>
          <CopyButton text={template} />
        </div>
        <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4 whitespace-pre-wrap font-sans leading-relaxed">
          {template}
        </pre>
        <p className="text-xs text-slate-400 mt-2">
          Send this to every completed customer. You only have 2 reviews — getting to 10–15 will move you up Google Maps rankings for &quot;kitchen cabinets Boca Raton&quot; searches.
        </p>
      </div>
    </div>
  );
}

// ── Home Shows panel ──────────────────────────────────────────────────────────

const SHOWS = [
  {
    name: 'Palm Beach Home Show',
    dates: 'May 22–25, 2026',
    location: 'Palm Beach County Convention Center\n650 Okeechobee Blvd, West Palm Beach, FL',
    hours: 'Fri–Sun 11am–7pm · Mon 11am–6pm',
    url: 'https://homeshows.com/home-show-palm-beach/',
    urgency: 'This week',
    color: 'border-red-200 bg-red-50/40',
    badge: 'bg-red-500',
  },
  {
    name: 'Fort Lauderdale Home Show',
    dates: 'September 4–7, 2026',
    location: 'Broward County Convention Center\nFort Lauderdale, FL',
    hours: 'Labor Day weekend',
    url: 'https://homeshows.com/home-show-dates-fort-lauderdale-labor-day/',
    urgency: 'Plan ahead',
    color: 'border-blue-200 bg-blue-50/40',
    badge: 'bg-blue-500',
  },
];

function HomeShowsPanel() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">These are the two biggest consumer home shows in South Florida. Homeowners attend specifically because they&apos;re planning a renovation — highest purchase intent of any channel.</p>
      {SHOWS.map((s) => (
        <div key={s.name} className={`rounded-xl border p-4 ${s.color}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${s.badge}`}>{s.urgency}</span>
                <p className="text-sm font-bold text-slate-800">{s.name}</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">{s.dates}</p>
              <p className="text-xs text-slate-500 whitespace-pre-line mt-1">{s.location}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.hours}</p>
            </div>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline shrink-0"
            >
              Info & Register <ExternalLink size={11} />
            </a>
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-400">Call 1-888-353-3976 to ask about exhibitor spots. Even attending as a visitor and handing out cards is worth it.</p>
    </div>
  );
}

// ── Pipeline Tools section ────────────────────────────────────────────────────

type ToolTab = 'groups' | 'alerts' | 'reviews' | 'shows';

const TOOLS: { id: ToolTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'groups',  label: 'Facebook Groups', icon: Users,    desc: 'Monitor daily' },
  { id: 'alerts',  label: 'Google Alerts',   icon: Bell,     desc: 'Set up once' },
  { id: 'reviews', label: 'Get Reviews',     icon: Star,     desc: '2 → 15 reviews' },
  { id: 'shows',   label: 'Home Shows',      icon: Calendar, desc: 'May & Sep 2026' },
];

function PipelineTools() {
  const [active, setActive] = useState<ToolTab>('groups');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-slate-100">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-2 text-[11px] font-semibold transition-colors border-b-2 ${
                isActive
                  ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:block">{t.label}</span>
              <span className="text-[9px] font-normal opacity-70">{t.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="p-5">
        {active === 'groups'  && <FacebookGroupsPanel />}
        {active === 'alerts'  && <GoogleAlertsPanel />}
        {active === 'reviews' && <ReviewRequestPanel />}
        {active === 'shows'   && <HomeShowsPanel />}
      </div>
    </div>
  );
}

// ── Phase progress ────────────────────────────────────────────────────────────

const PHASES = [
  { label: 'Auditing lead channels',   desc: 'Checking social, directory & inbound sources…' },
  { label: 'Searching for live leads', desc: 'Scanning posts from the last 30 days…' },
  { label: 'Checking online presence', desc: "Looking up Alon's Kitchens on Google, Houzz, Yelp…" },
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
            <input value={services} onChange={(e) => setServices(e.target.value)} className="input" placeholder="Custom kitchen cabinets, remodeling" />
          </div>
          <div>
            <label className="label">Monthly lead budget</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} className="input" placeholder="$500" />
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
    const timer = setInterval(() => setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p)), 18_000);
    try {
      const text = await callClaude(buildAuditPrompt(city, services, budget));
      setResult(text);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Lead Audit & Pipeline Tools</h2>
              <p className="text-xs text-slate-400">AI channel audit · Facebook monitor · review requests · home shows</p>
            </div>
          </div>
          <button
            onClick={runAudit}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              loading ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-brand-700 text-white hover:bg-brand-600 shadow-brand-700/25'
            }`}
          >
            {loading ? <><RefreshCw size={14} className="animate-spin" /> Running…</> : <><Play size={14} /> Run Full Audit</>}
          </button>
        </div>
      </div>

      {/* ── Pipeline tools (always visible) ── */}
      <PipelineTools />

      {/* ── Config ── */}
      <ConfigPanel city={city} setCity={setCity} services={services} setServices={setServices} budget={budget} setBudget={setBudget} />

      {/* ── Progress ── */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Audit in progress</p>
          <div className="space-y-3">
            {PHASES.map((p, i) => {
              const done = i < phase, active = i === phase, pending = i > phase;
              return (
                <div key={i} className={`flex items-start gap-3 transition-opacity ${pending ? 'opacity-30' : 'opacity-100'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                    done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300 ring-offset-1' : 'bg-slate-100 text-slate-400'
                  }`}>{done ? '✓' : i + 1}</div>
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
            <button onClick={runAudit} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
              <RefreshCw size={12} /> Re-run
            </button>
          </div>
          <div className="space-y-0.5">{renderMarkdown(result)}</div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !result && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Run the AI audit when you&apos;re ready</p>
          <p className="text-xs text-slate-400 max-w-xs">Claude searches 10+ channels live, finds active leads in your area, checks your online presence, and gives a ranked action plan.</p>
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
