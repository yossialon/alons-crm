'use client';
import { useState, useEffect, useCallback } from 'react';
import { Lead, Supplier, ScanResult, ToastState } from '@/types';
import {
  getLeads, createLead, updateLead, deleteLead,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getScanResults, clearScanResults, importScanResult,
} from '@/lib/api';
import { useTab } from '@/contexts/TabContext';
import Toast from '@/components/ui/Toast';
import LeadModal from '@/components/LeadModal';
import SupplierModal from '@/components/SupplierModal';
import MessageModal from '@/components/MessageModal';
import DashboardTab from '@/components/tabs/DashboardTab';
import LeadsTab from '@/components/tabs/LeadsTab';
import FindLeadsTab from '@/components/tabs/FindLeadsTab';
import AutoScanTab, { useAutoScan } from '@/components/tabs/AutoScanTab';
import SuppliersTab from '@/components/tabs/SuppliersTab';
import { Settings, Users, Building2 } from 'lucide-react';

export default function DashboardPage() {
  // ── Tab context (replaces local tab state) ─────────────────────────────────
  const { tab, setAutoScanBadge, setHeaderAction } = useTab();

  // ── Local state ────────────────────────────────────────────────────────────
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [suppliers, setSuppliers]     = useState<Supplier[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [toast, setToast]             = useState<ToastState | null>(null);
  const [showAddLead, setShowAddLead]         = useState(false);
  const [editLead, setEditLead]               = useState<Lead | null>(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editSupplier, setEditSupplier]       = useState<Supplier | null>(null);
  const [msgLead, setMsgLead]                 = useState<Lead | ScanResult | null>(null);
  const [autoEnabled, setAutoEnabled]         = useState(true);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Inject action buttons into the Header based on active tab ──────────────
  useEffect(() => {
    const btnClass =
      'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-sm transition-colors';
    if (tab === 'leads') {
      setHeaderAction(
        <button className={btnClass} onClick={() => setShowAddLead(true)}>
          + Add Lead
        </button>
      );
    } else if (tab === 'suppliers') {
      setHeaderAction(
        <button className={btnClass} onClick={() => setShowAddSupplier(true)}>
          + Add Supplier
        </button>
      );
    } else {
      setHeaderAction(null);
    }
  }, [tab, setHeaderAction]);

  // ── Keep Auto-Scan badge count in sync ─────────────────────────────────────
  useEffect(() => {
    setAutoScanBadge(scanResults.filter((r) => !r.imported).length);
  }, [scanResults, setAutoScanBadge]);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    try { setLeads((await getLeads()) as Lead[]); } catch {}
  }, []);

  const loadSuppliers = useCallback(async () => {
    try { setSuppliers((await getSuppliers()) as Supplier[]); } catch {}
  }, []);

  const loadScanResults = useCallback(async () => {
    try { setScanResults((await getScanResults()) as ScanResult[]); } catch {}
  }, []);

  useEffect(() => {
    loadLeads();
    loadSuppliers();
    loadScanResults();
  }, [loadLeads, loadSuppliers, loadScanResults]);

  // ── Auto-scan ──────────────────────────────────────────────────────────────
  const handleScanComplete = useCallback(async (found: object[]) => {
    await loadScanResults();
    notify(`🔍 Found ${found.length} leads across South FL & Tampa!`);
  }, [loadScanResults]);

  const { scanning, scanProgress, nextScanIn, runScan } = useAutoScan(autoEnabled, handleScanComplete);

  // ── Lead operations ────────────────────────────────────────────────────────
  const handleCreateLead = async (data: Partial<Lead>) => {
    try { await createLead(data); await loadLeads(); notify('Lead added.'); }
    catch (e) { notify(e instanceof Error ? e.message : 'Failed.', false); }
  };

  const handleUpdateLead = async (id: string, data: Partial<Lead>) => {
    try { await updateLead(id, data); await loadLeads(); notify('Lead updated.'); }
    catch { notify('Update failed.', false); }
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLead(id); await loadLeads(); notify('Lead removed.', false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) await handleUpdateLead(id, { ...lead, status: status as Lead['status'] });
  };

  const handleImportFindLead = async (data: object) => {
    try {
      await createLead({ ...(data as Partial<Lead>), status: 'new' });
      await loadLeads();
      notify(`Imported: ${(data as { name: string }).name}`);
    } catch (e) { notify(e instanceof Error ? e.message : 'Import failed.', false); }
  };

  // ── Supplier operations ────────────────────────────────────────────────────
  const handleCreateSupplier = async (data: Partial<Supplier>) => {
    try { await createSupplier(data); await loadSuppliers(); notify('Supplier added.'); }
    catch { notify('Failed.', false); }
  };

  const handleUpdateSupplier = async (id: string, data: Partial<Supplier>) => {
    try { await updateSupplier(id, data); await loadSuppliers(); notify('Supplier updated.'); }
    catch { notify('Update failed.', false); }
  };

  const handleDeleteSupplier = async (id: string) => {
    await deleteSupplier(id); await loadSuppliers(); notify('Supplier removed.', false);
  };

  // ── Scan result operations ─────────────────────────────────────────────────
  const handleImportScan = async (id: string, name: string) => {
    try {
      await importScanResult(id);
      await loadLeads(); await loadScanResults();
      notify(`Imported: ${name}`);
    } catch (e) { notify(e instanceof Error ? e.message : 'Import failed.', false); }
  };

  const handleClearScans = async () => {
    await clearScanResults(); setScanResults([]);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = {
    total:            leads.length,
    new:              leads.filter((l) => l.status === 'new').length,
    qualified:        leads.filter((l) => l.status === 'qualified').length,
    homeowners:       leads.filter((l) => l.type === 'Homeowner').length,
    contractors:      leads.filter((l) => l.type === 'Contractor' || l.type === 'Developer').length,
    autoNew:          scanResults.filter((r) => !r.imported).length,
    newThisWeek:      leads.filter((l) => {
      const d = new Date(l.created_at ?? l.date ?? '');
      return !isNaN(d.getTime()) && d.getTime() > weekAgo;
    }).length,
    activePipeline:   leads.filter((l) => l.status === 'contacted' || l.status === 'qualified').length,
    pendingSuppliers: suppliers.filter((s) => s.status === 'pending').length,
  };

  return (
    <>
      <Toast toast={toast} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-16 space-y-0">
        {/* ── Main tabs ── */}
        {tab === 'dashboard' && (
          <DashboardTab
            leads={leads} scanResults={scanResults} stats={stats}
            scanning={scanning} scanProgress={scanProgress}
            autoEnabled={autoEnabled} nextScanIn={nextScanIn}
            onScanNow={runScan} onToggleAuto={() => setAutoEnabled((p) => !p)}
          />
        )}
        {tab === 'leads' && (
          <LeadsTab
            leads={leads} onEdit={setEditLead} onDelete={handleDeleteLead}
            onStatusChange={handleStatusChange} onMessage={setMsgLead}
          />
        )}
        {tab === 'find' && (
          <FindLeadsTab onImport={handleImportFindLead} onMessage={(lead) => setMsgLead(lead as Lead)} />
        )}
        {tab === 'auto' && (
          <AutoScanTab
            scanResults={scanResults} autoEnabled={autoEnabled}
            scanning={scanning} scanProgress={scanProgress} nextScanIn={nextScanIn}
            onImport={handleImportScan} onMessage={setMsgLead}
            onClear={handleClearScans} onScanNow={runScan}
            onToggleAuto={() => setAutoEnabled((p) => !p)}
          />
        )}
        {tab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers} onEdit={setEditSupplier} onDelete={handleDeleteSupplier}
          />
        )}

        {/* ── Placeholder tabs ── */}
        {tab === 'customers' && <PlaceholderPage icon={<Building2 size={40} />} title="Customers" desc="Track your homeowner and B2B client relationships. Coming soon." />}
        {tab === 'employees' && <PlaceholderPage icon={<Users size={40} />} title="Employees" desc="Manage your team, assign leads, and track performance. Coming soon." />}
        {tab === 'settings'  && <PlaceholderPage icon={<Settings size={40} />} title="Settings" desc="Account details, notification preferences, and integrations. Coming soon." />}
      </div>

      {/* ── Modals ── */}
      {(showAddLead || editLead) && (
        <LeadModal
          lead={editLead}
          onClose={() => { setShowAddLead(false); setEditLead(null); }}
          onSave={editLead ? (d) => handleUpdateLead(editLead.id, d) : handleCreateLead}
        />
      )}
      {(showAddSupplier || editSupplier) && (
        <SupplierModal
          supplier={editSupplier}
          onClose={() => { setShowAddSupplier(false); setEditSupplier(null); }}
          onSave={editSupplier ? (d) => handleUpdateSupplier(editSupplier.id, d) : handleCreateSupplier}
        />
      )}
      {msgLead && (
        <MessageModal lead={msgLead as Lead} onClose={() => setMsgLead(null)} />
      )}
    </>
  );
}

function PlaceholderPage({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-5">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 max-w-sm">{desc}</p>
      <div className="mt-6 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
        🚧 Under Construction
      </div>
    </div>
  );
}
