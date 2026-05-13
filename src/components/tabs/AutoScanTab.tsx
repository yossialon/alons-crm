'use client';
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { ScanResult } from '@/types';
import { callClaude, parseLeadsFromText, saveScanResults } from '@/lib/api';
import { AUTO_SEARCH_AREAS, AUTO_INTERVAL_MS, buildAutoPrompt } from '@/lib/constants';
import { computeLeadScore, isDuplicate } from '@/lib/scoring';
import LeadCard from '../LeadCard';
import { PulsingDot } from '../ui/Badges';
import { Play, Trash2, Download } from 'lucide-react';

const LAST_RUN_KEY = 'alons_last_auto_v4';

interface Props {
  scanResults: ScanResult[];
  existingLeads?: { phone?: string; name: string }[];
  autoEnabled: boolean;
  scanning: boolean;
  scanProgress: { current: number; total: number; area: string };
  nextScanIn: string;
  onImport: (id: string, name: string) => void;
  onMessage: (lead: ScanResult) => void;
  onClear: () => void;
  onScanNow: () => void;
  onToggleAuto: () => void;
}

type SortKey = 'score' | 'newest' | 'area';
type PotentialFilter = 'all' | 'high' | 'medium' | 'low';

export default function AutoScanTab({
  scanResults, existingLeads = [],
  autoEnabled, scanning, scanProgress, nextScanIn,
  onImport, onMessage, onClear, onScanNow, onToggleAuto,
}: Props) {
  const [sortBy,     setSortBy]     = useState<SortKey>('score');
  const [potFilter,  setPotFilter]  = useState<PotentialFilter>('all');
  const [minScore,   setMinScore]   = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [importing,  setImporting]  = useState(false);

  const unreviewed = scanResults.filter((r) => !r.imported).length;

  const filtered = useMemo(() => {
    let list = scanResults.filter((r) => !r.imported);
    if (potFilter !== 'all') list = list.filter((r) => r.potential === potFilter);
    if (typeFilter !== 'all') list = list.filter((r) => r.type.toLowerCase() === typeFilter);
    list = list.filter((r) => computeLeadScore(r) >= minScore);
    if (sortBy === 'score')  list = [...list].sort((a, b) => computeLeadScore(b) - computeLeadScore(a));
    if (sortBy === 'newest') list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'area')   list = [...list].sort((a, b) => a.area.localeCompare(b.area));
    return list;
  }, [scanResults, potFilter, typeFilter, minScore, sortBy]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...filtered.map((r) => r.id)]));
    }
  };

  const bulkImport = async () => {
    if (importing || selected.size === 0) return;
    setImporting(true);
    for (const id of selected) {
      const r = scanResults.find((x) => x.id === id);
      if (r) onImport(r.id, r.name);
    }
    setSelected(new Set());
    setImporting(false);
  };

  return (
    <div className="space-y-5">
      {/* Control panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 mb-0.5">
              <PulsingDot />
              Automatic Lead Scanner
            </div>
            <p className="text-xs text-slate-400">
              Runs every 5 hrs · {AUTO_SEARCH_AREAS.length} areas · Web search across Google Maps, Nextdoor, Reddit, Houzz &amp; permits
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {autoEnabled && (
              <span className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-500">
                ⏱ Next: <strong className="text-amber-700">{nextScanIn}</strong>
              </span>
            )}
            <button
              onClick={onScanNow}
              disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-brand-700 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <Play size={13} />
              {scanning ? `Scanning ${scanProgress.area}…` : 'Run Now'}
            </button>
            <button
              onClick={onToggleAuto}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                autoEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              {autoEnabled ? '🟢 Auto ON' : '🔴 Auto OFF'}
            </button>
          </div>
        </div>

        {scanning && (
          <div className="mt-4">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-amber-700 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AUTO_SEARCH_AREAS.map((a, i) => (
                <span
                  key={a}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    i < scanProgress.current
                      ? 'bg-emerald-50 text-emerald-700'
                      : i === scanProgress.current - 1
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {i < scanProgress.current ? '✓ ' : i === scanProgress.current - 1 ? '⟳ ' : ''}{a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {scanResults.length === 0 && !scanning && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="font-bold text-base text-slate-700 mb-2">Ready to scan</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            Click Run Now to search Google Maps, Nextdoor, Reddit, Houzz, and permit records across South FL &amp; Tampa
          </p>
          <button
            onClick={onScanNow}
            className="px-7 py-3 rounded-xl text-sm font-bold text-white bg-brand-700 hover:bg-brand-600 shadow-md transition-all"
          >
            ▶ Start First Scan
          </button>
        </div>
      )}

      {/* Results */}
      {scanResults.length > 0 && (
        <div>
          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Sort</p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-300"
                >
                  <option value="score">By Score</option>
                  <option value="newest">Newest</option>
                  <option value="area">By Area</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Potential</p>
                <select
                  value={potFilter}
                  onChange={(e) => setPotFilter(e.target.value as PotentialFilter)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-300"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Type</p>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-300"
                >
                  <option value="all">All Types</option>
                  <option value="contractor">Contractor</option>
                  <option value="homeowner">Homeowner</option>
                  <option value="developer">Developer</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Min Score</p>
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-300"
                >
                  <option value={0}>Any</option>
                  <option value={40}>40+</option>
                  <option value={60}>60+</option>
                  <option value={80}>80+ (Hot)</option>
                </select>
              </div>
              <div className="ml-auto flex items-end gap-2">
                <button
                  onClick={onClear}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={11} /> Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Bulk toolbar */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <button
                onClick={toggleAll}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  allSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-300 hover:border-amber-400'
                }`}
              >
                {allSelected && <span className="text-white text-[10px] font-black">✓</span>}
              </button>
              <p className="text-xs text-slate-500">
                {unreviewed} unreviewed · {filtered.length} shown
                {selected.size > 0 && <span className="font-semibold text-amber-700"> · {selected.size} selected</span>}
              </p>
              {selected.size > 0 && (
                <button
                  onClick={bulkImport}
                  disabled={importing}
                  className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  <Download size={11} />
                  {importing ? 'Importing…' : `Import ${selected.size}`}
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((r) => {
              const inCRM = isDuplicate({ phone: r.phone, name: r.name }, existingLeads);
              return (
                <LeadCard
                  key={r.id}
                  lead={r}
                  imported={r.imported}
                  isExisting={inCRM}
                  selectable={!inCRM && !r.imported}
                  selected={selected.has(r.id)}
                  onToggleSelect={() => setSelected((prev) => {
                    const next = new Set(prev);
                    next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                    return next;
                  })}
                  onImport={!inCRM && !r.imported ? () => onImport(r.id, r.name) : undefined}
                  onMessage={!inCRM ? () => onMessage(r) : undefined}
                />
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No results match the current filters.</p>
            )}
          </div>

          {/* Already imported */}
          {scanResults.some((r) => r.imported) && (
            <details className="mt-4">
              <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-500 px-1">
                {scanResults.filter((r) => r.imported).length} already imported
              </summary>
              <div className="space-y-2 mt-2">
                {scanResults.filter((r) => r.imported).map((r) => (
                  <LeadCard key={r.id} lead={r} imported />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// Hook that manages scan scheduling — used by the parent dashboard page
export function useAutoScan(
  autoEnabled: boolean,
  onScanComplete: (results: object[]) => void,
) {
  const [scanning, setScanning]         = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, area: '' });
  const [lastRun, setLastRun]           = useState<string | null>(null);
  const [nextScanIn, setNextScanIn]     = useState('Loading...');
  const [hydrated, setHydrated]         = useState(false);
  const scanningRef  = useRef(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLastRun(localStorage.getItem(LAST_RUN_KEY));
    setHydrated(true);
  }, []);

  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    const now = new Date().toISOString();
    setLastRun(now);
    if (typeof window !== 'undefined') localStorage.setItem(LAST_RUN_KEY, now);

    const found: object[] = [];
    for (let i = 0; i < AUTO_SEARCH_AREAS.length; i++) {
      const area = AUTO_SEARCH_AREAS[i];
      setScanProgress({ current: i + 1, total: AUTO_SEARCH_AREAS.length, area });
      try {
        const text = await callClaude(buildAutoPrompt(area));
        parseLeadsFromText(text).forEach((r) => found.push(r));
      } catch {}
      await new Promise((res) => setTimeout(res, 1200));
    }

    if (found.length > 0) {
      await saveScanResults(found);
      onScanComplete(found);
    }

    scanningRef.current = false;
    setScanning(false);
    setScanProgress({ current: 0, total: 0, area: '' });
  }, [onScanComplete]);

  useEffect(() => {
    if (!hydrated) { setNextScanIn('Loading...'); return; }
    const tick = () => {
      if (!lastRun) { setNextScanIn('Ready'); return; }
      const diff = new Date(lastRun).getTime() + AUTO_INTERVAL_MS - Date.now();
      if (diff <= 0) { setNextScanIn('Ready'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setNextScanIn(`${h}h ${m}m ${s}s`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, [hydrated, lastRun]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!autoEnabled) { clearTimeout(timerRef.current); return; }
    const stored = localStorage.getItem(LAST_RUN_KEY);
    const delay  = stored ? Math.max(0, new Date(stored).getTime() + AUTO_INTERVAL_MS - Date.now()) : 0;
    timerRef.current = setTimeout(async () => {
      await runScan();
      timerRef.current = setInterval(runScan, AUTO_INTERVAL_MS) as unknown as ReturnType<typeof setTimeout>;
    }, delay);
    return () => { clearTimeout(timerRef.current); clearInterval(timerRef.current as unknown as ReturnType<typeof setInterval>); };
  }, [autoEnabled, runScan]);

  return { scanning, scanProgress, nextScanIn, runScan };
}
