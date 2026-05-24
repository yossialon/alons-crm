'use client';
import { Lead } from '@/types';
import { KanbanCard } from '@/components/ui/Primitives';

/* ── Column config ─────────────────────────────────────────────────────────── */
const COLUMNS = [
  { key: 'new',       label: 'New',       dot: 'bg-info-400',   header: 'bg-info-50   dark:bg-info-900/20   border-info-200   dark:border-info-800   text-info-700   dark:text-info-300'   },
  { key: 'contacted', label: 'Contacted', dot: 'bg-amber-400',  header: 'bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800  text-amber-700  dark:text-amber-300'  },
  { key: 'qualified', label: 'Qualified', dot: 'bg-brand-500',  header: 'bg-brand-50  dark:bg-brand-950/30  border-brand-200  dark:border-brand-800  text-brand-700  dark:text-brand-300'  },
  { key: 'closed',    label: 'Closed',    dot: 'bg-zinc-400',   header: 'bg-zinc-100  dark:bg-zinc-800       border-zinc-200   dark:border-zinc-700   text-zinc-600   dark:text-zinc-400'   },
] as const;

const STATUS_ORDER = ['new', 'contacted', 'qualified', 'closed'] as const;

interface Props {
  leads:          Lead[];
  onStatusChange: (id: string, status: string) => Promise<void>;
  onEdit:         (lead: Lead) => void;
}

export default function KanbanTab({ leads, onStatusChange, onEdit }: Props) {
  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-[720px]">
          {COLUMNS.map((col, colIdx) => {
            const colLeads = leads.filter((l) => l.status === col.key);
            return (
              <div key={col.key} className="flex-1 min-w-[175px]">

                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-[8px] mb-3 border ${col.header}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-bold">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-white/70 dark:bg-black/20 rounded-full px-1.5 py-0.5 border border-white/80 dark:border-white/10 text-zinc-500 dark:text-zinc-400">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {colLeads.length === 0 && (
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-[8px] p-5 text-center text-xs text-zinc-300 dark:text-zinc-600">
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
    </div>
  );
}
