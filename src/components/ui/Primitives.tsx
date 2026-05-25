'use client';
/**
 * UI Primitives — design-system building blocks.
 *
 * All components are purely presentational; data & callbacks come from props.
 * Import what you need:
 *   import { StatCard, LeadTag, ScoreBar, ActivityItem, KanbanCard, ThreadItem, MessageBubble } from '@/components/ui/Primitives';
 */

import { ReactNode } from 'react';
import { ArrowRight, MapPin, Phone, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import type { FC, SVGProps } from 'react';
type LucideIcon = FC<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;
import { Lead } from '@/types';

/* ─────────────────────────────────────────────────────────────────────────────
 * 0. SectionHeader
 * Consistent section title used inside cards and tab pages.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface SectionHeaderProps {
  title:    string;
  count?:   number | string;
  action?:  ReactNode;
  icon?:    LucideIcon;
  iconBg?:  string;
  iconColor?: string;
}

export function SectionHeader({ title, count, action, icon: Icon, iconBg, iconColor }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-2.5">
        {Icon && iconBg && iconColor && (
          <div className={`w-7 h-7 rounded-[8px] ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={14} className={iconColor} />
          </div>
        )}
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
        {count !== undefined && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{count}</span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 0b. EmptyState
 * Centered empty-state block used when a list has no items.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface EmptyStateProps {
  icon?:     ReactNode;
  title:     string;
  body?:     string;
  action?:   ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center select-none">
      {icon && (
        <div className="w-12 h-12 rounded-[12px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{title}</p>
      {body && <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 1. StatCard
 * Dashboard hero metric with left accent stripe, icon, big number & sub-label.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface StatCardProps {
  label:    string;
  value:    number | string;
  sub?:     string;
  delta?:   string;           // e.g. "+12% this week"
  positive?: boolean;         // true = green delta, false = red delta
  icon:     ReactNode;
  iconBg:   string;           // Tailwind bg class  e.g. "bg-brand-50"
  iconColor:string;           // Tailwind text class e.g. "text-brand-600"
  accent:   string;           // Tailwind bg class for left stripe e.g. "bg-brand-500"
}

export function StatCard({ label, value, sub, delta, positive, icon, iconBg, iconColor, accent }: StatCardProps) {
  return (
    <div className="card p-4 flex items-start gap-3 relative overflow-hidden">
      {/* Left accent stripe */}
      <div className={`absolute left-0 inset-y-0 w-[3px] rounded-l-[12px] ${accent}`} />

      <div className="flex-1 pl-1 min-w-0">
        <p className="label">{label}</p>
        <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 leading-none tabular-nums">
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted mt-1">{sub}</p>}
        {delta && (
          <p className={`text-[11px] font-semibold mt-1 ${positive ? 'text-brand-600 dark:text-brand-400' : 'text-coral dark:text-coral-400'}`}>
            {delta}
          </p>
        )}
      </div>

      <div className={`w-9 h-9 rounded-[8px] ${iconBg} flex items-center justify-center shrink-0`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 2. LeadTag
 * Colored pill badge for status / type / potential.
 * ─────────────────────────────────────────────────────────────────────────────*/

type LeadStatus    = 'new' | 'contacted' | 'qualified' | 'closed';
type LeadType      = 'Homeowner' | 'Contractor' | 'Developer';
type LeadPotential = 'high' | 'medium' | 'low';

const STATUS_CFG: Record<LeadStatus, { bg: string; text: string; dot: string; label: string }> = {
  new:       { bg: 'bg-info-50    dark:bg-info-700/20',    text: 'text-info-700    dark:text-info-300',    dot: 'bg-info-500',   label: 'New'       },
  contacted: { bg: 'bg-amber-50   dark:bg-amber-700/20',   text: 'text-amber-700   dark:text-amber-300',   dot: 'bg-amber-500',  label: 'Contacted' },
  qualified: { bg: 'bg-brand-50   dark:bg-brand-900/40',   text: 'text-brand-800   dark:text-brand-300',   dot: 'bg-brand-500',  label: 'Qualified' },
  closed:    { bg: 'bg-zinc-100   dark:bg-zinc-800',       text: 'text-zinc-500    dark:text-zinc-400',    dot: 'bg-zinc-400',   label: 'Closed'    },
};

const TYPE_CFG: Record<LeadType, { bg: string; text: string; icon: string }> = {
  Homeowner:  { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: '🏠' },
  Contractor: { bg: 'bg-info-50   dark:bg-info-900/30',   text: 'text-info-700   dark:text-info-300',   icon: '🔨' },
  Developer:  { bg: 'bg-amber-50  dark:bg-amber-900/30',  text: 'text-amber-700  dark:text-amber-300',  icon: '🏗️' },
};

const POTENTIAL_CFG: Record<LeadPotential, { bg: string; text: string; label: string; arrow: string }> = {
  high:   { bg: 'bg-brand-50 dark:bg-brand-900/30', text: 'text-brand-700 dark:text-brand-400', label: 'High',   arrow: '↑' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Medium', arrow: '→' },
  low:    { bg: 'bg-zinc-100 dark:bg-zinc-800',     text: 'text-zinc-500 dark:text-zinc-400',   label: 'Low',    arrow: '↓' },
};

export function StatusTag({ status }: { status: string }) {
  const c = STATUS_CFG[status as LeadStatus] ?? STATUS_CFG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function TypeTag({ type }: { type: string }) {
  const c = TYPE_CFG[type as LeadType] ?? { bg: 'bg-zinc-100', text: 'text-zinc-500', icon: '?' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
      {c.icon} {type}
    </span>
  );
}

export function PotentialTag({ potential }: { potential: string }) {
  const c = POTENTIAL_CFG[potential as LeadPotential] ?? POTENTIAL_CFG.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
      {c.arrow} {c.label}
    </span>
  );
}

/** Generic convenience export — pass variant='status'|'type'|'potential' + value */
export function LeadTag({ variant, value }: { variant: 'status' | 'type' | 'potential'; value: string }) {
  if (variant === 'status')    return <StatusTag status={value} />;
  if (variant === 'type')      return <TypeTag type={value} />;
  if (variant === 'potential') return <PotentialTag potential={value} />;
  return null;
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 3. ScoreBar
 * Horizontal bar 0-100 with color-coded fill and numeric label.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface ScoreBarProps {
  score:   number;   // 0-100
  label?:  string;   // e.g. "AI Score"
  showPct?: boolean; // default true
  height?: string;   // Tailwind h class, default "h-1.5"
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-brand-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-coral';
}

export function ScoreBar({ score, label, showPct = true, height = 'h-1.5' }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2 min-w-0">
      {label && <span className="text-[10px] text-muted whitespace-nowrap shrink-0">{label}</span>}
      <div className={`flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden ${height}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showPct && (
        <span className="text-[10px] font-semibold tabular-nums value-mono shrink-0 w-7 text-right">
          {pct}
        </span>
      )}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 4. ActivityItem
 * Single row in an activity / timeline feed.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface ActivityItemProps {
  icon:       ReactNode;
  iconBg:     string;    // e.g. "bg-brand-50 dark:bg-brand-950"
  iconColor:  string;    // e.g. "text-brand-600 dark:text-brand-400"
  text:       string;    // main description
  meta?:      string;    // secondary detail
  time:       string;    // "2h ago", "Today", etc.
  onClick?:   () => void;
}

export function ActivityItem({ icon, iconBg, iconColor, text, meta, time, onClick }: ActivityItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 py-2.5 ${onClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-[8px] transition-colors' : ''}`}
    >
      <div className={`w-7 h-7 rounded-[8px] ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        <span className={`${iconColor} [&>svg]:w-3.5 [&>svg]:h-3.5`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-snug">{text}</p>
        {meta && <p className="text-[10px] text-muted mt-0.5">{meta}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-hint">{time}</span>
        {onClick && <ArrowRight size={11} className="text-zinc-300 dark:text-zinc-600" />}
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 5. KanbanCard
 * Compact lead card for the pipeline board. Supports edit & column-move.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface KanbanCardProps {
  lead:    Lead;
  colIdx:  number;           // 0-3 (new→closed)
  onEdit:  (lead: Lead) => void;
  onMove:  (dir: 1 | -1) => void;
}

export function KanbanCard({ lead, colIdx, onEdit, onMove }: KanbanCardProps) {
  const STATUS_ORDER = ['new', 'contacted', 'qualified', 'closed'] as const;

  return (
    <div className="card p-3 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-default group">
      {/* Top row: name + edit */}
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 leading-tight line-clamp-2">
          {lead.name}
        </p>
        <button
          onClick={() => onEdit(lead)}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-[6px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
        >
          <Edit2 size={11} />
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted">
        <MapPin size={10} className="shrink-0" />
        <span className="truncate">{lead.area}</span>
      </div>

      {lead.phone && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <Phone size={10} className="shrink-0" />
          <span className="truncate">{lead.phone}</span>
        </div>
      )}

      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <TypeTag type={lead.type} />
        <PotentialTag potential={lead.potential} />
      </div>

      {/* Move arrows */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => onMove(-1)}
          disabled={colIdx === 0}
          className="p-1 rounded-[6px] text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-0 transition-all"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[9px] text-hint tabular-nums">
          {lead.date ? new Date(lead.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
        </span>
        <button
          onClick={() => onMove(1)}
          disabled={colIdx === STATUS_ORDER.length - 1}
          className="p-1 rounded-[6px] text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-0 transition-all"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 6. ThreadItem
 * Row in a social inbox thread list.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface ThreadItemProps {
  name:        string;
  preview:     string;
  time:        string;
  unread:      number;
  isHot?:      boolean;
  platform?:   string;       // 'whatsapp' | 'instagram' | 'facebook'
  active?:     boolean;
  onClick:     () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp:  'bg-brand-500',
  instagram: 'bg-purple-500',
  facebook:  'bg-info-500',
};

export function ThreadItem({ name, preview, time, unread, isHot, platform, active, onClick }: ThreadItemProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const avatarBg = platform ? PLATFORM_COLORS[platform] ?? 'bg-zinc-400' : 'bg-brand-500';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
        active
          ? 'bg-brand-50 dark:bg-brand-950/40'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
      }`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5`}>
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-semibold truncate ${active ? 'text-brand-800 dark:text-brand-300' : 'text-zinc-800 dark:text-zinc-100'}`}>
            {name}
            {isHot && <span className="ml-1 text-coral">🔥</span>}
          </p>
          <span className="text-[10px] text-hint shrink-0">{time}</span>
        </div>
        <p className="text-[11px] text-muted truncate mt-0.5">{preview}</p>
      </div>

      {/* Unread badge */}
      {unread > 0 && (
        <div className="w-4 h-4 bg-brand rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-1">
          {unread > 9 ? '9+' : unread}
        </div>
      )}
    </button>
  );
}


/* ─────────────────────────────────────────────────────────────────────────────
 * 7. MessageBubble
 * Single message in a social inbox conversation panel.
 * ─────────────────────────────────────────────────────────────────────────────*/

interface MessageBubbleProps {
  text:        string;
  time:        string;
  direction:   'inbound' | 'outbound';
  senderName?: string;   // shown for inbound
  isRead?:     boolean;  // shown for outbound
}

export function MessageBubble({ text, time, direction, senderName, isRead }: MessageBubbleProps) {
  const isOut = direction === 'outbound';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isOut ? 'items-end' : 'items-start'} flex flex-col gap-1`}>

        {!isOut && senderName && (
          <span className="text-[10px] text-muted font-semibold px-1">{senderName}</span>
        )}

        <div
          className={`px-3 py-2 rounded-[10px] text-sm leading-relaxed ${
            isOut
              ? 'bg-brand text-white rounded-br-[3px]'
              : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-bl-[3px]'
          }`}
        >
          {text}
        </div>

        <div className={`flex items-center gap-1 px-1 ${isOut ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-hint">{time}</span>
          {isOut && isRead && (
            <span className="text-[10px] text-brand-400 dark:text-brand-500">✓✓</span>
          )}
          {isOut && !isRead && (
            <span className="text-[10px] text-zinc-300 dark:text-zinc-600">✓</span>
          )}
        </div>

      </div>
    </div>
  );
}
