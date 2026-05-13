'use client';
import { Lead } from '@/types';
import { MapPin, Phone } from 'lucide-react';

const COLUMNS = [
  { key: 'new',       label: 'New',       dot: 'bg-blue-400',    header: 'bg-blue-50 border-blue-200 text-blue-700' },
  { key: 'contacted', label: 'Contacted', dot: 'bg-amber-400',   header: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'qualified', label: 'Qualified', dot: 'bg-emerald-500', header: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { key: 'closed',    label: 'Closed',    dot: 'bg-slate-400',   header: 'bg-slate-100 border-slate-200 text-slate-600' },
] as const;

const STATUS_ORDER = ['new', 'contacted', 'qualified', 'closed'] as const;

const POTENTIAL_COLORS: Record<string, string> = {
  high:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low:    'text-slate-500 bg-slate-100 border-slate-200',
};

interface Props {
  leads: Lead[];
  onStatusChange: (id: string, status: string) => Promise<void>;
  onEdit: (lead: Lead) => void;
}

export default function KanbanTab({ leads, onStatusChange, onEdit }: Props) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-[720px]">
        {COLUMNS.map((col, colIdx) => {
          const colLeads = leads.filter((l) => l.status === col.key);
          return (
            <div key={col.key} className="flex-1 min-w-[170px]">
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 border ${col.header}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-bold">{col.label}</span>
                </div>
                <span className="text-[10px] font-bold bg-white/70 rounded-full px-1.5 py-0.5 border border-white/80 text-slate-500">
                  {colLeads.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {colLeads.length === 0 && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center text-xs text-slate-300">
                    Empty
                  </div>
                )}
                {colLeads.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    colIdx={colIdx}
                    onEdit={onEdit}
                    onMove={async (dir) => {
                      const next = STATUS_ORDER[colIdx + dir];
                      if (next) await onStatusChange(lead.id, next);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ lead, colIdx, onEdit, onMove }: {
  lead: Lead;
  colIdx: number;
  onEdit: (l: Lead) => void;
  onMove: (dir: 1 | -1) => Promise<void>;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <button
          onClick={() => onEdit(lead)}
          className="font-semibold text-sm text-slate-800 hover:text-amber-700 text-left leading-snug"
        >
          {lead.name}
        </button>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border capitalize ${POTENTIAL_COLORS[lead.potential] ?? ''}`}>
          {lead.potential}
        </span>
      </div>

      <div className="space-y-0.5 mb-2.5">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <MapPin size={9} className="shrink-0" />
          <span className="truncate">{lead.area}</span>
          <span className="text-slate-200">·</span>
          <span className="truncate">{lead.type}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Phone size={9} className="shrink-0" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {colIdx > 0 && (
          <button
            onClick={() => onMove(-1)}
            className="flex-1 text-[10px] py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            ← Back
          </button>
        )}
        {colIdx < 3 && (
          <button
            onClick={() => onMove(1)}
            className="flex-1 text-[10px] py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-semibold transition-colors"
          >
            Advance →
          </button>
        )}
      </div>
    </div>
  );
}
