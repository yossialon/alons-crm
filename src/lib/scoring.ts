// Lead scoring — returns 0–100 based on contact completeness, source quality, potential, and type.

interface Scoreable {
  potential?: string;
  phone?:     string;
  email?:     string;
  website?:   string;
  source?:    string;
  rating?:    string;
  notes?:     string;
  type?:      string;
}

const SOURCE_BONUS: [string, number][] = [
  ['permit',      12],
  ['referral',    10],
  ['web form',     8],
  ['google maps',  8],
  ['houzz',        7],
  ['linkedin',     7],
  ['nextdoor',     6],
  ['reddit',       5],
  ['facebook',     5],
  ['instagram',    4],
  ['social',       3],
  ['auto-scan',    3],
];

const TYPE_BONUS: Record<string, number> = {
  developer:  6,
  contractor: 4,
  homeowner:  2,
};

export function computeLeadScore(lead: Scoreable): number {
  const base = lead.potential === 'high' ? 60 : lead.potential === 'medium' ? 40 : 20;

  let bonus = 0;
  if (lead.phone?.trim())   bonus += 10;
  if (lead.email?.trim())   bonus += 5;
  if (lead.website?.trim()) bonus += 5;
  if (lead.rating?.trim())  bonus += 5;

  const notesLen = lead.notes?.trim().length ?? 0;
  if (notesLen > 100) bonus += 5;
  else if (notesLen > 40) bonus += 2;

  const srcLower = (lead.source ?? '').toLowerCase();
  for (const [key, val] of SOURCE_BONUS) {
    if (srcLower.includes(key)) { bonus += val; break; }
  }

  bonus += TYPE_BONUS[(lead.type ?? '').toLowerCase()] ?? 0;

  return Math.min(100, base + bonus);
}

export type ScoreLabel = 'Hot' | 'Warm' | 'Cool' | 'Cold';

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  if (score >= 40) return 'Cool';
  return 'Cold';
}

export function scoreStyles(score: number): { pill: string; bar: string } {
  if (score >= 80) return { pill: 'text-red-700 bg-red-50 border-red-200',       bar: 'bg-red-500' };
  if (score >= 60) return { pill: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-400' };
  if (score >= 40) return { pill: 'text-blue-700 bg-blue-50 border-blue-200',    bar: 'bg-blue-400' };
  return                   { pill: 'text-slate-500 bg-slate-100 border-slate-200', bar: 'bg-slate-300' };
}

export function isDuplicate(
  candidate: { phone?: string; name: string },
  haystack: { phone?: string; name: string }[],
): boolean {
  const phone = candidate.phone?.replace(/\D/g, '');
  if (phone && phone.length >= 7) {
    if (haystack.some((l) => l.phone?.replace(/\D/g, '') === phone)) return true;
  }
  const name = candidate.name.toLowerCase().trim();
  return haystack.some((l) => l.name.toLowerCase().trim() === name);
}
