'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead, Supplier, ToastState } from '@/types';
import {
  getLeads, createLead, updateLead, deleteLead,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
} from '@/lib/api';
import { useTab } from '@/contexts/TabContext';
import Toast from '@/components/ui/Toast';
import LeadModal from '@/components/LeadModal';
import SupplierModal from '@/components/SupplierModal';
import MessageModal from '@/components/MessageModal';
import DashboardTab from '@/components/tabs/DashboardTab';
import LeadsTab from '@/components/tabs/LeadsTab';
import FindLeadsTab from '@/components/tabs/FindLeadsTab';
import SuppliersTab from '@/components/tabs/SuppliersTab';
import KanbanTab from '@/components/tabs/KanbanTab';
import TasksTab from '@/components/tabs/TasksTab';
import ProjectsTab from '@/components/tabs/ProjectsTab';
import AnalyticsTab from '@/components/tabs/AnalyticsTab';
import CustomersTab from '@/components/tabs/CustomersTab';
import SocialTab from '@/components/tabs/SocialTab';
import OutreachTab from '@/components/tabs/OutreachTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import { Settings, UserCheck } from 'lucide-react';

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

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Inject action buttons into the Header based on active tab ──────────────
  useEffect(() => {
    const btnClass =
      'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 shadow-sm transition-colors';
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-16 space-y-0">
        {/* ── Main tabs ── */}
        {tab === 'dashboard' && (
          <DashboardTab leads={leads} stats={stats} />
        )}
        {tab === 'leads' && (
          <LeadsTab
            leads={leads} onEdit={setEditLead} onDelete={handleDeleteLead}
            onStatusChange={handleStatusChange} onMessage={setMsgLead}
          />
        )}
        {tab === 'find' && (
          <FindLeadsTab
            existingLeads={leads}
            onImport={handleImportFindLead}
            onMessage={(lead) => setMsgLead(lead as Lead)}
          />
        )}
        {tab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers} onEdit={setEditSupplier} onDelete={handleDeleteSupplier}
          />
        )}

        {/* ── New feature tabs ── */}
        {tab === 'kanban' && (
          <KanbanTab
            leads={leads}
            onStatusChange={handleStatusChange}
            onEdit={setEditLead}
          />
        )}
        {tab === 'tasks'     && <TasksTab />}
        {tab === 'projects'  && <ProjectsTab />}
        {tab === 'analytics' && <AnalyticsTab leads={leads} />}
        {tab === 'customers' && <CustomersTab />}
        {tab === 'social'    && <SocialTab />}
        {tab === 'outreach'  && <OutreachTab leads={leads.map((l) => ({ id: l.id, name: l.name }))} />}

        {/* ── Placeholder tabs ── */}
        {tab === 'employees' && <PlaceholderPage icon={<UserCheck size={40} />} title="Employees" desc="Manage your team, assign leads, and track performance. Coming soon." />}
        {tab === 'settings'  && <SettingsTab />}
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
