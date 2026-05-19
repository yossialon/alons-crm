// Lead scoring — returns 0–100 based on contact completeness, source quality, potential, and type.

export function computeLeadScore(lead: {
  phone?: string; email?: string; website?: string;
  rating?: string; source?: string; notes?: string;
  potential?: string;
}): number {
  let score = 0;
  if (lead.phone?.trim()) score += 25;
  if (lead.email?.trim()) score += 20;
  if (lead.website?.trim()) score += 15;
  const rating = parseFloat(lead.rating ?? '');
  if (!isNaN(rating) && rating >= 4.0) score += 15;
  else if (!isNaN(rating) && rating > 0) score += 5;
  if (lead.source === 'Permit Records') score += 20;
  else if (lead.source === 'Google Maps') score += 10;
  const notes = (lead.notes ?? '').toLowerCase();
  if (['looking for', 'need', 'hiring', 'seeking', 'want'].some(k => notes.includes(k))) score += 10;
  if (!lead.phone?.trim() && !lead.email?.trim()) score -= 20;
  return Math.max(0, Math.min(100, score));
}

export function leadScoreLabel(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
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

function normalizePhone(p: string) { return p.replace(/\D/g, ''); }
function normalizeEmail(e: string) { return e.toLowerCase().trim(); }
function normalizeWebsite(w: string) {
  return w.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export function isDuplicate(
  incoming: { name?: string; phone?: string; email?: string; website?: string },
  existing: { name?: string; phone?: string; email?: string; website?: string }[]
): boolean {
  const inPhone = incoming.phone ? normalizePhone(incoming.phone) : '';
  const inEmail = incoming.email ? normalizeEmail(incoming.email) : '';
  const inSite  = incoming.website ? normalizeWebsite(incoming.website) : '';
  return existing.some(e => {
    if (inPhone && e.phone && normalizePhone(e.phone) === inPhone) return true;
    if (inEmail && e.email && normalizeEmail(e.email) === inEmail) return true;
    if (inSite  && e.website && normalizeWebsite(e.website) === inSite) return true;
    return false;
  });
}
