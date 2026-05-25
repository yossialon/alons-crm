'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Lead, Supplier, ToastState } from '@/types';
import {
  getLeads, createLead, updateLead, deleteLead,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
} from '@/lib/api';
import { useTab } from '@/contexts/TabContext';
import Toast from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Settings, UserCheck } from 'lucide-react';

// ── Skeleton fallback used while each lazy tab chunk loads ────────────────────
const TabSkeleton = () => (
  <div className="p-4 sm:p-6 space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-[12px]" />)}
    </div>
    <div className="skeleton h-40 rounded-[12px]" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="skeleton h-48 rounded-[12px]" />
      <div className="skeleton h-48 rounded-[12px]" />
    </div>
  </div>
);

// ── Lazy-loaded tab components ────────────────────────────────────────────────
// Each tab is its own JS chunk — only the active tab's code is downloaded.
// Tabs that are used on first load (dashboard, leads, kanban) get slightly
// higher priority by being listed first; others load on demand.
const opts = { loading: () => <TabSkeleton /> };

const DashboardTab      = dynamic(() => import('@/components/tabs/DashboardTab'),      opts);
const LeadsTab          = dynamic(() => import('@/components/tabs/LeadsTab'),           opts);
const KanbanTab         = dynamic(() => import('@/components/tabs/KanbanTab'),          opts);
const TasksTab          = dynamic(() => import('@/components/tabs/TasksTab'),           opts);
const SocialTab         = dynamic(() => import('@/components/tabs/SocialTab'),          opts);
const FindLeadsTab      = dynamic(() => import('@/components/tabs/FindLeadsTab'),       opts);
const LeadAuditTab      = dynamic(() => import('@/components/tabs/LeadAuditTab'),       opts);
const SuppliersTab      = dynamic(() => import('@/components/tabs/SuppliersTab'),       opts);
const ProjectsTab       = dynamic(() => import('@/components/tabs/ProjectsTab'),        opts);
const AnalyticsTab      = dynamic(() => import('@/components/tabs/AnalyticsTab'),       opts);
const CustomersTab      = dynamic(() => import('@/components/tabs/CustomersTab'),       opts);
const OutreachTab       = dynamic(() => import('@/components/tabs/OutreachTab'),        opts);
const MarketingTab      = dynamic(() => import('@/components/tabs/MarketingTab'),       opts);
const CreativeStudioTab = dynamic(() => import('@/components/tabs/CreativeStudioTab'),  opts);
const SettingsTab       = dynamic(() => import('@/components/tabs/SettingsTab'),        opts);

// Modals are also lazy — they're only ever opened by user action
const LeadModal         = dynamic(() => import('@/components/LeadModal'));
const SupplierModal     = dynamic(() => import('@/components/SupplierModal'));
const MessageModal      = dynamic(() => import('@/components/MessageModal'));
const JobCompletionModal = dynamic(() => import('@/components/JobCompletionModal'));
const AgentChat          = dynamic(() => import('@/components/AgentChat'));

export default function DashboardPage() {
  // ── Tab context (replaces local tab state) ─────────────────────────────────
  const { tab, setTab, setHeaderAction } = useTab();

  // Switch to the tab specified in the URL (e.g. after OAuth redirect ?tab=social)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab) setTab(urlTab as Parameters<typeof setTab>[0]);
  }, [setTab]);

  // ── Local state ────────────────────────────────────────────────────────────
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [suppliers, setSuppliers]     = useState<Supplier[]>([]);
  const [toast, setToast]             = useState<ToastState | null>(null);
  const [showAddLead, setShowAddLead]         = useState(false);
  const [editLead, setEditLead]               = useState<Lead | null>(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editSupplier, setEditSupplier]       = useState<Supplier | null>(null);
  const [msgLead, setMsgLead]                 = useState<Lead | null>(null);
  const [showJobCompletion, setShowJobCompletion]   = useState(false);
  const [jobCompletionLead, setJobCompletionLead]   = useState<Lead | null>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Inject action buttons into the Header based on active tab ──────────────
  useEffect(() => {
    const btnClass = 'btn-primary inline-flex items-center gap-1.5';
    if (tab === 'leads' || tab === 'kanban') {
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

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    try { setLeads((await getLeads()) as Lead[]); } catch {}
  }, []);

  const loadSuppliers = useCallback(async () => {
    try { setSuppliers((await getSuppliers()) as Supplier[]); } catch {}
  }, []);

  useEffect(() => {
    loadLeads();
    loadSuppliers();
  }, [loadLeads, loadSuppliers]);

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
      const created = await createLead({ ...(data as Partial<Lead>), status: 'new' });
      await loadLeads();
      notify(`Imported: ${(data as { name: string }).name}`);

      const createdId = (created as { id?: string }).id;
      if (createdId && process.env.NEXT_PUBLIC_AUTO_OUTREACH_ON_IMPORT !== 'false') {
        const newLead = { ...(data as Partial<Lead>), status: 'new' };
        if ((newLead as { email?: string }).email) {
          fetch('/api/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: createdId, method: 'email', notes: 'Auto-outreach on import' }) }).catch(() => {});
        }
        if ((newLead as { phone?: string }).phone) {
          fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: `Call ${(newLead as { name?: string }).name ?? 'new lead'} — new lead imported`, due_date: new Date().toISOString().slice(0, 10), lead_id: createdId }) }).catch(() => {});
        }
      }
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

  // ── Stats ──────────────────────────────────────────────────────────────────
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = {
    total:            leads.length,
    new:              leads.filter((l) => l.status === 'new').length,
    qualified:        leads.filter((l) => l.status === 'qualified').length,
    homeowners:       leads.filter((l) => l.type === 'Homeowner').length,
    contractors:      leads.filter((l) => l.type === 'Contractor' || l.type === 'Developer').length,
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

      {/* Redesigned tabs own their padding ──────────────────────────────────── */}
      {tab === 'dashboard' && (
        <ErrorBoundary>
          <DashboardTab leads={leads} stats={stats} />
        </ErrorBoundary>
      )}
      {tab === 'leads' && (
        <ErrorBoundary>
          <LeadsTab
            leads={leads} onEdit={setEditLead} onDelete={handleDeleteLead}
            onStatusChange={handleStatusChange} onMessage={setMsgLead}
            onCompleteJob={(lead) => { setJobCompletionLead(lead); setShowJobCompletion(true); }}
          />
        </ErrorBoundary>
      )}
      {tab === 'kanban' && (
        <ErrorBoundary>
          <KanbanTab leads={leads} onStatusChange={handleStatusChange} onEdit={setEditLead} />
        </ErrorBoundary>
      )}
      {tab === 'tasks'  && <ErrorBoundary><TasksTab /></ErrorBoundary>}
      {tab === 'social' && <ErrorBoundary><SocialTab /></ErrorBoundary>}

      {/* Unredesigned tabs — wrapped with standard padding ──────────────────── */}
      {(tab === 'find' || tab === 'audit' || tab === 'suppliers' || tab === 'projects' ||
        tab === 'analytics' || tab === 'customers' || tab === 'outreach' || tab === 'marketing' ||
        tab === 'creative' || tab === 'employees' || tab === 'settings') && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-16">
          {tab === 'find'      && <ErrorBoundary><FindLeadsTab existingLeads={leads} onImport={handleImportFindLead} onMessage={(lead) => setMsgLead(lead as Lead)} /></ErrorBoundary>}
          {tab === 'audit'     && <ErrorBoundary><LeadAuditTab /></ErrorBoundary>}
          {tab === 'suppliers' && <ErrorBoundary><SuppliersTab suppliers={suppliers} onEdit={setEditSupplier} onDelete={handleDeleteSupplier} /></ErrorBoundary>}
          {tab === 'projects'  && <ErrorBoundary><ProjectsTab /></ErrorBoundary>}
          {tab === 'analytics' && <ErrorBoundary><AnalyticsTab leads={leads} /></ErrorBoundary>}
          {tab === 'customers' && <ErrorBoundary><CustomersTab /></ErrorBoundary>}
          {tab === 'outreach'  && <ErrorBoundary><OutreachTab leads={leads.map((l) => ({ id: l.id, name: l.name }))} /></ErrorBoundary>}
          {tab === 'marketing' && <ErrorBoundary><MarketingTab /></ErrorBoundary>}
          {tab === 'creative'  && <ErrorBoundary><CreativeStudioTab /></ErrorBoundary>}
          {tab === 'employees' && <PlaceholderPage icon={<UserCheck size={40} />} title="Employees" desc="Manage your team, assign leads, and track performance. Coming soon." />}
          {tab === 'settings'  && <ErrorBoundary><SettingsTab /></ErrorBoundary>}
        </div>
      )}

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
      {showJobCompletion && (
        <JobCompletionModal
          lead={jobCompletionLead}
          onClose={() => { setShowJobCompletion(false); setJobCompletionLead(null); }}
          onComplete={() => { setShowJobCompletion(false); setJobCompletionLead(null); }}
        />
      )}

      {/* Boss Agent floating chat */}
      <ErrorBoundary variant="inline">
        <AgentChat />
      </ErrorBoundary>
    </>
  );
}

function PlaceholderPage({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-[16px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-5">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">{title}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">{desc}</p>
      <div className="mt-6 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800">
        🚧 Coming soon
      </div>
    </div>
  );
}
