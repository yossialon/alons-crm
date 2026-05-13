'use client';
import { TypePill, PotentialBadge, sourceIcon } from './ui/Badges';
import { computeLeadScore, scoreLabel, scoreStyles } from '@/lib/scoring';

export interface LeadCardData {
  id?: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  area: string;
  type: string;
  source: string;
  rating: string;
  potential: string;
  notes: string;
  imported?: boolean;
}

interface Props {
  lead: LeadCardData;
  onImport?: () => void;
  onMessage?: () => void;
  imported?: boolean;
  isExisting?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function LeadCard({
  lead, onImport, onMessage,
  imported = false, isExisting = false,
  selectable = false, selected = false, onToggleSelect,
}: Props) {
  const score  = computeLeadScore(lead);
  const label  = scoreLabel(score);
  const styles = scoreStyles(score);
  const dim    = imported || isExisting;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      selected ? 'border-amber-400 ring-2 ring-amber-200' :
      isExisting ? 'border-slate-200 opacity-60' :
      imported  ? 'border-slate-200 opacity-70' :
      'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        {selectable && !isExisting && !imported && (
          <button
            onClick={onToggleSelect}
            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
              selected ? 'bg-amber-500 border-amber-500' : 'border-slate-300 hover:border-amber-400'
            }`}
          >
            {selected && <span className="text-white text-[10px] font-black">✓</span>}
          </button>
        )}

        {/* Avatar */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
          isExisting ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
        }`}>
          {lead.name.charAt(0).toUpperCase()}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-bold text-sm text-slate-800 truncate">{lead.name}</span>
            <TypePill type={lead.type} />
            <PotentialBadge potential={lead.potential} />
            {isExisting && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                ✓ In CRM
              </span>
            )}
            {imported && !isExisting && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Imported
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
            {lead.source  && <span>{sourceIcon(lead.source.split(' ')[0])} {lead.source}</span>}
            {lead.phone   && <span>📞 {lead.phone}</span>}
            {lead.email   && <span>✉️ {lead.email}</span>}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer noopener" className="text-blue-500 hover:underline">
                🌐 Website
              </a>
            )}
            {lead.rating  && <span>⭐ {lead.rating}</span>}
            {lead.area    && <span>📍 {lead.area}</span>}
          </div>

          {lead.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border-l-2 border-amber-400 leading-relaxed line-clamp-2">
              {lead.notes}
            </p>
          )}

          {/* Score bar */}
          {!isExisting && (
            <div className="flex items-center gap-2 mt-2.5">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles.pill}`}>
                {label} {score}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!dim && (
          <div className="flex flex-col gap-1.5 shrink-0">
            {onImport && (
              <button
                onClick={onImport}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap"
              >
                + Import
              </button>
            )}
            {onMessage && (
              <button
                onClick={onMessage}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                ✉️ Draft
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
