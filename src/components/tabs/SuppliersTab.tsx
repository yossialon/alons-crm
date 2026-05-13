'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Supplier } from '@/types';
import { Building2, Eye, Edit2, Trash2, X, Phone, Mail, Calendar, Search, Tag } from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:   { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', label: 'Active'   },
  pending:  { dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   label: 'Pending'  },
  inactive: { dot: 'bg-slate-400',   text: 'text-slate-500',   bg: 'bg-slate-100',   border: 'border-slate-200',   label: 'Inactive' },
} as const;

const CAT_CFG: Record<string, { text: string; bg: string; border: string }> = {
  'Wood & MDF':     { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
  'Hardware':       { text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
  'Laminates':      { text: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200'  },
  'Paint & Finish': { text: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200'    },
  'Countertops':    { text: 'text-cyan-700',    bg: 'bg-cyan-50',    border: 'border-cyan-200'    },
  'Appliances':     { text: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200'  },
  'Other':          { text: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200'   },
};

const ALL_CATEGORIES = ['Wood & MDF', 'Hardware', 'Laminates', 'Paint & Finish', 'Countertops', 'Appliances', 'Other'];

const STATUS_ORDER: Array<Supplier['status']> = ['active', 'pending', 'inactive'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function catStyle(category: string) {
  return CAT_CFG[category] ?? CAT_CFG['Other'];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Supplier['status'] }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function CategoryPill({ category }: { category: string }) {
  const c = catStyle(category);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {category}
    </span>
  );
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Search size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-1">No suppliers match your filters</p>
        <p className="text-xs text-slate-400 mb-4">Try adjusting your search or clearing the filters</p>
        <button onClick={onClear} className="px-4 py-2 rounded-xl bg-brand-700 text-white text-xs font-semibold hover:bg-brand-600 transition-colors">
          Clear filters
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <Building2 size={36} className="text-slate-300" />
      </div>
      <p className="text-base font-bold text-slate-700 mb-1">No suppliers yet</p>
      <p className="text-sm text-slate-400">Add your first supplier using the button above</p>
    </div>
  );
}

function ActionBtn({ children, onClick, title, className }: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  className: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${className}`}
    >
      {children}
    </button>
  );
}

// ── Quick View Panel ───────────────────────────────────────────────────────────

function QuickViewPanel({ supplier, onClose, onEdit }: {
  supplier: Supplier;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const sc = STATUS_CFG[supplier.status] ?? STATUS_CFG.inactive;
  const cc = catStyle(supplier.category);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/20 z-40 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-700/10 flex items-center justify-center">
              <Building2 size={18} className="text-brand-700" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">{supplier.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{supplier.contact}</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status + Category */}
          <div className="flex gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${cc.bg} ${cc.text} ${cc.border}`}>
              <Tag size={10} className="mr-1" />
              {supplier.category}
            </span>
          </div>

          {/* Contact details */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Info</p>
            {supplier.phone && (
              <a href={`tel:${supplier.phone}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-blue-600" />
                </div>
                <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">{supplier.phone}</span>
              </a>
            )}
            {supplier.email && (
              <a href={`mailto:${supplier.email}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} className="text-violet-600" />
                </div>
                <span className="text-sm text-slate-700 group-hover:text-violet-600 transition-colors">{supplier.email}</span>
              </a>
            )}
          </div>

          {/* Last contact */}
          {supplier.last_contact && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Contact</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={14} className="text-amber-600" />
                </div>
                <span className="text-sm text-slate-700">{relativeDate(supplier.last_contact)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{supplier.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={() => { close(); setTimeout(onEdit, 260); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            <Edit2 size={14} /> Edit Supplier
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  suppliers: Supplier[];
  onEdit: (s: Supplier) => void;
  onDelete: (id: string) => void;
}

export default function SuppliersTab({ suppliers, onEdit, onDelete }: Props) {
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<Supplier['status'] | ''>('');
  const [quickView, setQuickView]     = useState<Supplier | null>(null);

  const clearFilters = () => { setSearch(''); setCatFilter(''); setStatusFilter(''); };
  const isFiltered   = !!(search || categoryFilter || statusFilter);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.contact.toLowerCase().includes(q) &&
          !s.email.toLowerCase().includes(q) &&
          !s.category.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [suppliers, search, categoryFilter, statusFilter]);

  const statusCounts = useMemo(() =>
    Object.fromEntries(STATUS_ORDER.map((st) => [st, suppliers.filter((s) => s.status === st).length])),
    [suppliers]
  );

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-3">
        {/* Row 1: search + category + clear */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700/50 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700/20 transition-all text-slate-600"
          >
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Clear + count */}
          {isFiltered && (
            <button onClick={clearFilters} className="px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5">
              <X size={13} /> Clear
            </button>
          )}
          <span className="ml-auto self-center text-xs text-slate-400 font-medium whitespace-nowrap">
            {filtered.length} of {suppliers.length}
          </span>
        </div>

        {/* Row 2: status pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((st) => {
            const c = STATUS_CFG[st];
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(active ? '' : st)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? c.dot : 'bg-slate-300'}`} />
                {c.label}
                <span className={`ml-0.5 px-1 py-0.5 rounded text-[10px] font-bold ${active ? 'bg-white/60' : 'bg-slate-100'}`}>
                  {statusCounts[st] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState filtered={isFiltered} onClear={clearFilters} />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Supplier', 'Contact', 'Phone / Email', 'Category', 'Status', 'Last Contact', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setQuickView(s)}
                  className="group border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors cursor-pointer"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-brand-700/10 flex items-center justify-center flex-shrink-0">
                        <Building2 size={13} className="text-brand-700" />
                      </div>
                      <span className="font-semibold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">
                        {s.name}
                      </span>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3 text-sm text-slate-600">{s.contact}</td>

                  {/* Phone / Email */}
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">{s.phone}</div>
                    {s.email && <div className="text-xs text-slate-400 mt-0.5">{s.email}</div>}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <CategoryPill category={s.category} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>

                  {/* Last Contact */}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {relativeDate(s.last_contact)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionBtn
                        onClick={() => setQuickView(s)}
                        title="Quick view"
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Eye size={15} />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => onEdit(s)}
                        title="Edit supplier"
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      >
                        <Edit2 size={15} />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => onDelete(s.id)}
                        title="Delete supplier"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Quick View Panel ── */}
      {quickView && (
        <QuickViewPanel
          supplier={quickView}
          onClose={() => setQuickView(null)}
          onEdit={() => { setQuickView(null); onEdit(quickView); }}
        />
      )}
    </div>
  );
}
