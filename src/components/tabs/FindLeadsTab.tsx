'use client';
import { useState } from 'react';
import { callClaude, parseLeadsFromText } from '@/lib/api';
import { buildContractorPrompt, buildHomeownerPrompt, buildDeveloperPrompt, AREAS } from '@/lib/constants';
import { isDuplicate, computeLeadScore } from '@/lib/scoring';
import LeadCard, { LeadCardData } from '../LeadCard';
import Spinner from '../ui/Spinner';
import { Search, MapPin } from 'lucide-react';

interface Props {
  existingLeads?: { phone?: string; email?: string; website?: string; name: string }[];
  onImport: (lead: object) => Promise<void>;
  onMessage: (lead: object) => void;
}

type FindType = 'Contractors' | 'Homeowners' | 'Developers';
type LeadSource = 'AI Search' | 'Google Maps' | 'Permit Records';

const PROMPT_MAP: Record<FindType, (area: string) => string> = {
  Contractors: buildContractorPrompt,
  Homeowners:  buildHomeownerPrompt,
  Developers:  buildDeveloperPrompt,
};

const SEARCH_HINTS: Record<FindType, string> = {
  Contractors: 'Google Maps · Houzz · Angi · Facebook · BBB',
  Homeowners:  'Nextdoor · Reddit · Houzz boards · Facebook groups · Permits',
  Developers:  'Permit records · LinkedIn · NAHB/HBA · Local news',
};

const TYPE_ICONS: Record<FindType, string> = {
  Contractors: '🔨',
  Homeowners:  '🏠',
  Developers:  '🏗️',
};

function extractDomain(website: string): string {
  return website
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .split('/')[0];
}

export default function FindLeadsTab({ existingLeads = [], onImport, onMessage }: Props) {
  const [findType,    setFindType]    = useState<FindType>('Contractors');
  const [leadSource,  setLeadSource]  = useState<LeadSource>('AI Search');
  const [area,        setArea]        = useState('Boca Raton');
  const [loading,     setLoading]     = useState(false);
  const [results,     setResults]     = useState<LeadCardData[]>([]);
  const [importedSet, setImportedSet] = useState<Set<number>>(new Set());
  const [log,         setLog]         = useState('');

  const runEnrichment = (leads: LeadCardData[]) => {
    leads.forEach((lead, idx) => {
      if (!lead.website || lead.email) return;
      const domain = extractDomain(lead.website);
      if (!domain) return;
      fetch('/api/leads/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
        .then((r) => r.json())
        .then((data: { email?: string | null }) => {
          if (data.email) {
            setResults((prev) => {
              const next = [...prev];
              next[idx] = { ...next[idx], email: data.email!, enriched: true };
              return next;
            });
          }
        })
        .catch(() => {});
    });
  };

  const search = async () => {
    setLoading(true);
    setResults([]);
    setImportedSet(new Set());
    setLog('');
    try {
      if (leadSource === 'AI Search') {
        const text   = await callClaude(PROMPT_MAP[findType](area));
        const parsed = parseLeadsFromText(text) as LeadCardData[];
        if (parsed.length > 0) {
          setResults(parsed);
          setLog(`Found ${parsed.length} leads in ${area}`);
          runEnrichment(parsed);
        } else {
          setLog('No structured results — try a different area or type.');
          setResults([{
            name: 'Raw AI Response', phone: '', email: '', website: '',
            area, type: findType.slice(0, -1), source: 'AI', potential: 'medium',
            rating: '', notes: text.slice(0, 400),
          }]);
        }
      } else if (leadSource === 'Google Maps') {
        const res = await fetch('/api/leads/search/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'kitchen remodeling contractor', area }),
        });
        const data = await res.json() as { leads?: LeadCardData[]; error?: string };
        if (data.error) throw new Error(data.error);
        const leads = data.leads ?? [];
        setResults(leads);
        setLog(`Found ${leads.length} leads from Google Maps in ${area}`);
        runEnrichment(leads);
      } else if (leadSource === 'Permit Records') {
        const res = await fetch('/api/leads/search/permits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ area }),
        });
        const data = await res.json() as { leads?: LeadCardData[]; error?: string };
        if (data.error) throw new Error(data.error);
        const leads = data.leads ?? [];
        setResults(leads);
        setLog(`Found ${leads.length} permit leads in ${area}`);
        runEnrichment(leads);
      }
    } catch (err) {
      setLog(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const handleImport = async (lead: LeadCardData, idx: number) => {
    await onImport(lead);
    setImportedSet((prev) => new Set(prev).add(idx));
  };

  // Sort by score descending
  const sorted = [...results].sort((a, b) => computeLeadScore(b) - computeLeadScore(a));

  return (
    <div className="space-y-5">
      {/* Search card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="font-bold text-sm text-slate-800 mb-0.5">Real-Time Lead Search</p>
        <p className="text-xs text-slate-400 mb-4">
          AI searches Google Maps, Nextdoor, Reddit, Houzz, permit records &amp; more for real leads with contact info
        </p>

        {/* Type toggle */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Lead Type</p>
          <div className="flex gap-2">
            {(['Contractors', 'Homeowners', 'Developers'] as FindType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFindType(t)}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  findType === t
                    ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {TYPE_ICONS[t]} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Source toggle */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Source</p>
          <div className="flex gap-2">
            {(['AI Search', 'Google Maps', 'Permit Records'] as LeadSource[]).map((s) => (
              <button
                key={s}
                onClick={() => setLeadSource(s)}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  leadSource === s
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Area + search */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">City / Area</p>
            <div className="relative">
              <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400 transition-all appearance-none"
              >
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={search}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-brand-700 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            <Search size={14} />
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {leadSource === 'AI Search' && (
          <p className="mt-3 text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            🔍 Searches: {SEARCH_HINTS[findType]}
          </p>
        )}
      </div>

      {loading && <Spinner label={`Searching for ${findType.toLowerCase()} in ${area}…`} />}

      {!loading && log && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          {log}
        </p>
      )}

      {!loading && sorted.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-slate-800">
              {sorted.length} leads found in {area}
            </p>
            <p className="text-xs text-slate-400">Sorted by score</p>
          </div>
          <div className="space-y-2">
            {sorted.map((r, i) => {
              const origIdx = results.indexOf(r);
              const alreadyImported = importedSet.has(origIdx);
              const inCRM = isDuplicate(
                { phone: r.phone, email: r.email, website: r.website, name: r.name },
                existingLeads,
              );
              return (
                <LeadCard
                  key={i}
                  lead={r}
                  imported={alreadyImported}
                  isExisting={inCRM}
                  onImport={!alreadyImported && !inCRM ? () => handleImport(r, origIdx) : undefined}
                  onMessage={!inCRM ? () => onMessage(r) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
