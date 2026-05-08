'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { ScanResult } from '@/types';
import { callClaude, parseLeadsFromText, saveScanResults } from '@/lib/api';
import { AUTO_SEARCH_AREAS, AUTO_INTERVAL_MS, buildAutoPrompt } from '@/lib/constants';
import LeadCard from '../LeadCard';
import { PulsingDot } from '../ui/Badges';

const LAST_RUN_KEY = 'alons_last_auto_v4';

interface Props {
  scanResults: ScanResult[];
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

export default function AutoScanTab({ scanResults, autoEnabled, scanning, scanProgress, nextScanIn, onImport, onMessage, onClear, onScanNow, onToggleAuto }: Props) {
  const unreviewed = scanResults.filter((r) => !r.imported).length;

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <PulsingDot />Automatic Lead Scanner
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              Runs every 5 hours across {AUTO_SEARCH_AREAS.length} areas · Real web search · Contractors, homeowners & developers
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {autoEnabled && (
              <div style={{ fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px 14px', borderRadius: 8, color: '#475569' }}>
                ⏱ Next: <strong style={{ color: '#92400E' }}>{nextScanIn}</strong>
              </div>
            )}
            <button onClick={onScanNow} disabled={scanning} style={{ background: scanning ? '#E2E8F0' : '#92400E', color: scanning ? '#94A3B8' : '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: scanning ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit', boxShadow: scanning ? 'none' : '0 4px 12px rgba(146,64,14,.25)' }}>
              {scanning ? `Scanning ${scanProgress.area}…` : '▶ Run Now'}
            </button>
            <button onClick={onToggleAuto} style={{ background: autoEnabled ? '#DCFCE7' : '#FEE2E2', color: autoEnabled ? '#166534' : '#991B1B', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              {autoEnabled ? '🟢 Auto ON' : '🔴 Auto OFF'}
            </button>
          </div>
        </div>

        {scanning && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 5, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#92400E,#D97706)', borderRadius: 4, width: `${(scanProgress.current / scanProgress.total) * 100}%`, transition: 'width .5s' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {AUTO_SEARCH_AREAS.map((a, i) => (
                <span key={a} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: i < scanProgress.current ? '#DCFCE7' : i === scanProgress.current - 1 ? '#FEF3C7' : '#F1F5F9', color: i < scanProgress.current ? '#166534' : i === scanProgress.current - 1 ? '#92400E' : '#94A3B8' }}>
                  {i < scanProgress.current ? '✓ ' : i === scanProgress.current - 1 ? '⟳ ' : ''}{a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {scanResults.length === 0 && !scanning && (
        <div style={{ background: '#fff', border: '2px dashed #E2E8F0', borderRadius: 14, padding: '56px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#0F172A', marginBottom: 8 }}>Ready to scan</div>
          <div style={{ fontSize: 13, color: '#94A3B8', maxWidth: 360, margin: '0 auto 24px' }}>
            Click Run Now to search Google Maps, Nextdoor, Reddit, Houzz, and permit records across South FL & Tampa
          </div>
          <button onClick={onScanNow} style={{ background: '#92400E', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 32px', fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(146,64,14,.3)' }}>
            ▶ Start First Scan
          </button>
        </div>
      )}

      {scanResults.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
              {unreviewed} unreviewed · {scanResults.length} total
            </div>
            <button onClick={onClear} style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
              Clear All
            </button>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {scanResults.map((r) => (
              <LeadCard
                key={r.id}
                lead={r}
                imported={r.imported}
                onImport={() => onImport(r.id, r.name)}
                onMessage={() => onMessage(r)}
              />
            ))}
          </div>
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
  const [scanning, setScanning]       = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, area: '' });
  const [lastRun, setLastRun]         = useState<string | null>(() => localStorage.getItem(LAST_RUN_KEY));
  const [nextScanIn, setNextScanIn]   = useState('Ready');
  const scanningRef  = useRef(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    const now = new Date().toISOString();
    setLastRun(now);
    localStorage.setItem(LAST_RUN_KEY, now);

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

  // Countdown display
  useEffect(() => {
    const tick = () => {
      if (!lastRun) { setNextScanIn('Ready'); return; }
      const diff = new Date(lastRun).getTime() + AUTO_INTERVAL_MS - Date.now();
      if (diff <= 0) { setNextScanIn('Ready'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setNextScanIn(`${h}h ${m}m ${s}s`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, [lastRun]);

  // Auto-schedule
  useEffect(() => {
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
