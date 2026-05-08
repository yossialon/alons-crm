'use client';
import { useMemo, useState, useEffect } from 'react';
import {
  Search, X, Eye, Mail, Edit2, Trash2,
  Phone, MapPin, Globe, Calendar, ExternalLink,
  User, MessageSquare, ChevronDown, Users,
} from 'lucide-react';
import { Lead } from '@/types';
import { LEAD_TYPES } from '@/lib/constants';
import { sourceIcon } from '@/components/ui/Badges';

// ── Status / Type / Potential config ─────────────────────────────────────────

const STATUS_CFG = {
  new:       { label: 'New',       bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500',   activePill: 'bg-blue-600 text-white border-blue-600'   },
  contacted: { label: 'Contacted', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500',  activePill: 'bg-amber-500 text-white border-amber-500'  },
  qualified: { label: 'Qualified', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  activePill: 'bg-green-600 text-white border-green-600'  },
  closed:    { label: 'Closed',    bg: 'bg-slate-100', text: 'text-slate-500',  border: 'border-slate-200',  dot: 'bg-slate-400',  activePill: 'bg-slate-600 text-white border-slate-600'  },
} as const;

const TYPE_CFG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  Homeowner:  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: '🏠' },
  Contractor: { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200',   icon: '🔨' },
  Developer:  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🏗️' },
};

const POTENTIAL_CFG: Record<string, { bg: string; text: string; label: string; arrow: string }> = {
  high:   { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'High',   arrow: '↑' },
  medium: { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Medium', arrow: '→' },
  low:    { bg: 'bg-slate-50',   text: 'text-slate-500',   label: 'Low',    arrow: '↓' },
};

const STATUS_KEYS = ['new', 'contacted', 'qualified', 'closed'] as const;
const DATE_RANGES = ['All time', 'Today', 'This week', 'This month'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function matchDate(dateStr: string | undefined, range: string) {
  if (range === 'All time') return true;
  const d = new Date(dateStr || '');
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === 'Today')     return d.toDateString() === now.toDateString();
  if (range === 'This week') return Date.now() - d.getTime() < 7 * 86_400_000;
  if (range === 'This month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

// ── Badge components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const c = TYPE_CFG[type] ?? { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: '?' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border} whitespace-nowrap`}>
      {c.icon} {type}
    </span>
  );
}

function PotentialBadge({ potential }: { potential: string }) {
  const c = POTENTIAL_CFG[potential] ?? POTENTIAL_CFG.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.arrow} {c.label}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ isFiltered, onClear }: { isFiltered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center select-none">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shadow-inner">
          <div className="w-14 h-14 rounded-full bg-white border-2 border-dashed border-slate-200 flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
        </div>
        <span className="absolute -top-1 -right-1 text-lg">
          {isFiltered ? '🔍' : '✨'}
        </span>
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-2">
        {isFiltered ? 'No results match your filters' : 'No leads yet'}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
        {isFiltered
          ? "Try adjusting your search or clearing the active filters."
          : 'Add your first lead manually, or run the Auto-Scan to discover prospects across South Florida.'}
      </p>
      {isFiltered && (
        <button
          onClick={onClear}
          className="mt-5 flex items-center gap-2 text-xs font-semibold text-brand-700 border border-brand-700/30 bg-brand-700/5 hover:bg-brand-700/10 px-4 py-2 rounded-xl transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Clear all filters
        </button>
      )}
    </div>
  );
}

// ── Quick View Panel ──────────────────────────────────────────────────────────

function QuickViewPanel({
  lead, onClose, onEdit, onMessage,
}: {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
  onMessage: () => void;
}) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[380px] max-w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-700/10 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-700" />
            </div>
            <span className="text-sm font-bold text-slate-700">Lead Details</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

          {/* Hero */}
          <div className="px-5 py-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{lead.name}</h2>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <StatusBadge status={lead.status} />
                  <TypePill type={lead.type} />
                </div>
              </div>
              <PotentialBadge potential={lead.potential} />
            </div>
          </div>

          {/* Contact */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Info</p>
            {lead.phone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-700">{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-700">{lead.email}</span>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 truncate"
                >
                  {lead.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {[
                { label: 'Area',   icon: <MapPin className="w-3 h-3" />,  value: lead.area },
                { label: 'Source', icon: null,                              value: `${sourceIcon(lead.source)} ${lead.source}` },
                { label: 'Added',  icon: <Calendar className="w-3 h-3" />, value: relativeDate(lead.date) },
                ...(lead.rating ? [{ label: 'Rating', icon: null, value: `⭐ ${lead.rating}` }] : []),
              ].map(({ label, icon, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-slate-400 mb-1">{label}</p>
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-700">
                    {icon && <span className="text-slate-400">{icon}</span>}
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Notes</p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                <p className="text-sm text-slate-700 leading-relaxed">{lead.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2.5">
          <button
            onClick={() => { onMessage(); handleClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Message
          </button>
          <button
            onClick={() => { onEdit(); handleClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand-700 text-white hover:bg-brand-800 transition-colors shadow-sm"
          >
            <Edit2 className="w-4 h-4" /> Edit Lead
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onMessage: (lead: Lead) => void;
}

export default function LeadsTab({ leads, onEdit, onDelete, onStatusChange, onMessage }: Props) {
  const [search, setSearch]       = useState('');
  const [typeFilter, setType]     = useState('All');
  const [statusFilter, setStatus] = useState('All');
  const [dateRange, setDateRange] = useState('All time');
  const [quickView, setQuickView] = useState<Lead | null>(null);

  const isFiltered = search !== '' || typeFilter !== 'All' || statusFilter !== 'All' || dateRange !== 'All time';

  const clearFilters = () => {
    setSearch(''); setType('All'); setStatus('All'); setDateRange('All time');
  };

  const filtered = useMemo(() => leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        l.name.toLowerCase().includes(q) ||
        l.area.toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.phone ?? '').includes(q)
      ) &&
      (typeFilter === 'All' || l.type === typeFilter) &&
      (statusFilter === 'All' || l.status === statusFilter) &&
      matchDate(l.date, dateRange)
    );
  }), [leads, search, typeFilter, statusFilter, dateRange]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: leads.length };
    STATUS_KEYS.forEach((s) => { c[s] = leads.filter((l) => l.status === s).length; });
    return c;
  }, [leads]);

  return (
    <>
      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">

        {/* Row 1: Search + selects */}
        <div className="flex flex-wrap gap-2.5 items-center mb-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, area, email, phone…"
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700/20 placeholder:text-slate-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setType(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium focus:outline-none focus:border-brand-700 transition-all"
            >
              <option value="All">All Types</option>
              {LEAD_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Date */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-slate-700 font-medium focus:outline-none focus:border-brand-700 transition-all"
            >
              {DATE_RANGES.map((r) => <option key={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {isFiltered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400 font-medium whitespace-nowrap">
            {filtered.length} of {leads.length} leads
          </span>
        </div>

        {/* Row 2: Status quick-filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatus('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${statusFilter === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
          >
            All <span className="opacity-60 ml-0.5">({counts.All})</span>
          </button>
          {STATUS_KEYS.map((s) => {
            const c = STATUS_CFG[s];
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatus(active ? 'All' : s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? c.activePill : `bg-slate-50 text-slate-500 border-slate-200 hover:${c.bg} hover:${c.text} hover:${c.border}`}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/70' : c.dot}`} />
                {c.label}
                <span className="opacity-60">({counts[s] ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Lead', 'Phone', 'Type', 'Area', 'Status', 'Added', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-blue-50/30 transition-colors duration-100">

                    {/* Name + email */}
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <div className="font-semibold text-sm text-slate-900 group-hover:text-brand-700 transition-colors truncate">
                        {lead.name}
                      </div>
                      {lead.email && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">{lead.email}</div>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-2.5 h-2.5" /> site
                        </a>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {lead.phone}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <TypePill type={lead.type} />
                    </td>

                    {/* Area */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        {lead.area}
                      </div>
                    </td>

                    {/* Status — badge on top, invisible select underneath for click */}
                    <td className="px-4 py-3.5">
                      <div className="relative inline-block">
                        <StatusBadge status={lead.status} />
                        <select
                          value={lead.status}
                          onChange={(e) => onStatusChange(lead.id, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Change status"
                        >
                          {STATUS_KEYS.map((s) => (
                            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {relativeDate(lead.date)}
                    </td>

                    {/* Actions — hidden until row hover */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <ActionBtn
                          title="Quick View"
                          onClick={() => setQuickView(lead)}
                          className="bg-brand-700/10 text-brand-700 hover:bg-brand-700 hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title="Draft message"
                          onClick={() => onMessage(lead)}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title="Edit"
                          onClick={() => onEdit(lead)}
                          className="bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title="Delete"
                          onClick={() => onDelete(lead.id)}
                          className="bg-red-50 text-red-500 hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick View panel */}
      {quickView && (
        <QuickViewPanel
          lead={quickView}
          onClose={() => setQuickView(null)}
          onEdit={() => onEdit(quickView)}
          onMessage={() => onMessage(quickView)}
        />
      )}
    </>
  );
}

// Tiny reusable icon button
function ActionBtn({ children, onClick, title, className }: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${className}`}
    >
      {children}
    </button>
  );
}
