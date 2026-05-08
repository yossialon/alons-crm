'use client';
import { useState } from 'react';
import { callClaude, parseLeadsFromText } from '@/lib/api';
import { buildContractorPrompt, buildHomeownerPrompt, buildDeveloperPrompt, AREAS } from '@/lib/constants';
import LeadCard from '../LeadCard';
import Spinner from '../ui/Spinner';

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0',
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#0F172A',
  background: '#F8FAFC', outline: 'none',
};

interface Props {
  onImport: (lead: object) => Promise<void>;
  onMessage: (lead: object) => void;
}

type FindType = 'Contractors' | 'Homeowners' | 'Developers';

const PROMPT_MAP: Record<FindType, (area: string) => string> = {
  Contractors: buildContractorPrompt,
  Homeowners:  buildHomeownerPrompt,
  Developers:  buildDeveloperPrompt,
};

const SEARCH_LABELS: Record<FindType, string> = {
  Contractors: '🔍 Will search: Google Maps · Houzz · Angi/HomeAdvisor · Facebook · BBB',
  Homeowners:  '🔍 Will search: Nextdoor · Reddit · Houzz boards · Facebook groups · County permits',
  Developers:  '🔍 Will search: County permit records · New construction · LinkedIn · NAHB/HBA · Local news',
};

export default function FindLeadsTab({ onImport, onMessage }: Props) {
  const [findType, setFindType] = useState<FindType>('Contractors');
  const [area, setArea]         = useState('Boca Raton');
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<object[]>([]);
  const [log, setLog]           = useState('');

  const search = async () => {
    setLoading(true);
    setResults([]);
    setLog(`Searching for ${findType.toLowerCase()} in ${area}…`);
    try {
      const text   = await callClaude(PROMPT_MAP[findType](area));
      const parsed = parseLeadsFromText(text);
      if (parsed.length > 0) {
        setResults(parsed);
        setLog(`Found ${parsed.length} leads in ${area}.`);
      } else {
        setLog('No structured results. Raw response shown below.');
        setResults([{ name: 'Raw AI Response', phone: '', email: '', website: '', area, type: findType.slice(0, -1), source: 'AI', potential: 'medium', notes: text.slice(0, 400) }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLog(`Search failed: ${msg}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>Real-Time Lead Search</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
          AI searches Google Maps, Nextdoor, Reddit, Houzz, Permit Records & more to find real leads with actual contact info
        </div>

        {/* Type toggle */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6, letterSpacing: 0.3 }}>LEAD TYPE</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Contractors', 'Homeowners', 'Developers'] as FindType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFindType(t)}
                style={{
                  flex: 1, padding: '8px 4px', fontWeight: 600, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                  background: findType === t ? '#92400E' : '#F8FAFC',
                  color:      findType === t ? '#fff'    : '#475569',
                  border:    `1.5px solid ${findType === t ? '#92400E' : '#E2E8F0'}`,
                  borderRadius: 8, transition: 'all .15s',
                }}
              >
                {t === 'Contractors' ? '🔨' : t === 'Homeowners' ? '🏠' : '🏗️'} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Area + search */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 200px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5, letterSpacing: 0.3 }}>CITY / AREA</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} style={inp}>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <button
            onClick={search}
            disabled={loading}
            style={{ background: loading ? '#E2E8F0' : '#92400E', color: loading ? '#94A3B8' : '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontSize: 14, fontFamily: 'inherit', height: 40, boxShadow: loading ? 'none' : '0 4px 14px rgba(146,64,14,.3)' }}
          >
            {loading ? 'Searching…' : 'Search →'}
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#64748B', background: '#F8FAFC', padding: '10px 14px', borderRadius: 8 }}>
          {SEARCH_LABELS[findType]}
        </div>
      </div>

      {loading && <Spinner label={`Searching for ${findType.toLowerCase()} in ${area}…`} />}
      {!loading && log && (
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10, padding: '8px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          {log}
        </div>
      )}
      {!loading && results.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 }}>
            {results.length} leads found in {area}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {results.map((r, i) => (
              <LeadCard
                key={i}
                lead={r as Parameters<typeof LeadCard>[0]['lead']}
                onImport={() => onImport(r)}
                onMessage={() => onMessage(r)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
