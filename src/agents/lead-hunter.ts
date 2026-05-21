// ── Lead Hunter Agent ─────────────────────────────────────────────────────────
// Runs daily at 7 AM. Searches 4 sources for high-quality leads in South FL.
// Scores each lead ≥ LEAD_MIN_SCORE before importing.

import { logAgentRun, updateAgentRun, leadExists, importLead } from '@/agents/tools/database';
import { callClaude, callClaudeWithWebSearch } from '@/agents/tools/claude';
import { alertOwner } from '@/agents/tools/whatsapp';
import type { LeadSource } from '@/agents/types';

const MIN_SCORE = Number(process.env.LEAD_MIN_SCORE ?? '70');
const ORG_ID    = process.env.ORG_ID ?? '00000000-0000-0000-0000-000000000001';
const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY ?? '';

// ── Source 1: Google Places nearby kitchen/remodel contractors ───────────────
async function searchGooglePlaces(): Promise<LeadSource[]> {
  if (!GOOGLE_KEY) return [];
  const leads: LeadSource[] = [];

  // Search for new homeowner developments and remodel contractors in South FL
  const queries = [
    'new construction homes south florida',
    'kitchen remodel contractor broward county',
    'custom cabinets miami',
  ];

  for (const query of queries) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.set('query', query);
      url.searchParams.set('key', GOOGLE_KEY);
      url.searchParams.set('location', '26.1224,-80.1373'); // Fort Lauderdale
      url.searchParams.set('radius', '80000'); // 80km (South FL)

      const res = await fetch(url.toString());
      const data = await res.json() as { results?: { name: string; formatted_address?: string; formatted_phone_number?: string; rating?: number; user_ratings_total?: number }[] };

      for (const place of (data.results ?? []).slice(0, 5)) {
        leads.push({
          name:    place.name,
          address: place.formatted_address,
          phone:   place.formatted_phone_number,
          source:  'Google Places',
          score:   calculateScore({ hasPhone: !!place.formatted_phone_number, hasAddress: !!place.formatted_address, type: 'contractor' }),
          notes:   `Google rating: ${place.rating ?? 'N/A'} (${place.user_ratings_total ?? 0} reviews)`,
        });
      }
    } catch (err) {
      console.error('[LeadHunter] Google Places error:', err);
    }
  }

  return leads;
}

// ── Source 2: FL Permit Search via internal API ───────────────────────────────
async function searchPermits(): Promise<LeadSource[]> {
  const leads: LeadSource[] = [];
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const counties = ['broward', 'miami-dade', 'palm-beach'];

  for (const county of counties) {
    try {
      const res = await fetch(
        `${BASE}/api/leads/search/permits?county=${county}&keyword=kitchen+cabinet+renovation`,
        { headers: { Cookie: '' } },
      );
      if (!res.ok) continue;
      const permits = await res.json() as { applicant?: string; owner?: string; address?: string; description?: string }[];

      for (const p of (permits ?? []).slice(0, 3)) {
        leads.push({
          name:    p.applicant || p.owner || 'Homeowner',
          address: p.address,
          source:  `FL Permit — ${county}`,
          score:   calculateScore({ hasAddress: !!p.address, type: 'homeowner', hasPermit: true }),
          notes:   p.description,
        });
      }
    } catch (err) {
      console.error(`[LeadHunter] Permit search error (${county}):`, err);
    }
  }

  return leads;
}

// ── Source 3: Competitor bad reviews (Claude web search) ─────────────────────
async function searchBadReviews(): Promise<LeadSource[]> {
  try {
    const prompt = `Search for recent (last 30 days) 1-2 star Google reviews of kitchen cabinet companies in South Florida (Broward, Miami-Dade, Palm Beach counties).
    Focus on complaints about: poor quality, delays, overpricing, bad service.
    For each negative review found, extract: customer name (first name only if available), the company they complained about, their general area/city, and why they were unhappy.
    Format as JSON array: [{"name": "...", "city": "...", "competitor": "...", "complaint": "..."}]
    Return ONLY the JSON array, no other text.`;

    const raw = await callClaudeWithWebSearch(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const reviews = JSON.parse(match[0]) as { name?: string; city?: string; competitor?: string; complaint?: string }[];
    return reviews.slice(0, 5).map((r) => ({
      name:   r.name ?? 'Unhappy Customer',
      city:   r.city,
      source: `Competitor Review — ${r.competitor ?? 'Unknown'}`,
      score:  calculateScore({ type: 'homeowner', hasComplaint: true }),
      notes:  `Unhappy with competitor: ${r.competitor}. Complaint: ${r.complaint}`,
    }));
  } catch (err) {
    console.error('[LeadHunter] Bad review search error:', err);
    return [];
  }
}

// ── Source 4: Claude web search for new homeowner leads ───────────────────────
async function searchWebLeads(): Promise<LeadSource[]> {
  try {
    const prompt = `Search for homeowners in South Florida (Broward, Miami-Dade, Palm Beach) who recently:
    1. Posted on Nextdoor, Reddit, or Facebook groups asking for kitchen cabinet recommendations
    2. Posted renovation project announcements
    3. Shared "just bought a new home" posts mentioning kitchen renovation needs

    Focus on posts from the last 2 weeks. Extract business or homeowner contact info where visible.
    Format as JSON array: [{"name": "...", "city": "...", "source_platform": "...", "context": "..."}]
    Return ONLY the JSON array.`;

    const raw = await callClaudeWithWebSearch(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const results = JSON.parse(match[0]) as { name?: string; city?: string; source_platform?: string; context?: string }[];
    return results.slice(0, 5).map((r) => ({
      name:   r.name ?? 'Homeowner',
      city:   r.city,
      source: `Web Search — ${r.source_platform ?? 'Social'}`,
      score:  calculateScore({ type: 'homeowner', hasWebPresence: true }),
      notes:  r.context,
    }));
  } catch (err) {
    console.error('[LeadHunter] Web lead search error:', err);
    return [];
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function calculateScore(factors: {
  hasPhone?:       boolean;
  hasEmail?:       boolean;
  hasAddress?:     boolean;
  hasPermit?:      boolean;
  hasComplaint?:   boolean;
  hasWebPresence?: boolean;
  type?:           'homeowner' | 'contractor';
}): number {
  let score = 40; // base
  if (factors.hasPhone)       score += 15;
  if (factors.hasEmail)       score += 10;
  if (factors.hasAddress)     score += 10;
  if (factors.hasPermit)      score += 20; // permitted project = active buyer
  if (factors.hasComplaint)   score += 15; // unhappy with competitor = ready to switch
  if (factors.hasWebPresence) score += 10;
  if (factors.type === 'homeowner') score += 5;
  return Math.min(score, 100);
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function runLeadHunter(trigger: 'cron' | 'manual' = 'cron'): Promise<{
  found: number;
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const runId = await logAgentRun('lead-hunter', trigger);
  const errors: string[] = [];
  let imported = 0;
  let skipped  = 0;

  try {
    // Run all 4 sources in parallel
    const [placeLeads, permitLeads, reviewLeads, webLeads] = await Promise.allSettled([
      searchGooglePlaces(),
      searchPermits(),
      searchBadReviews(),
      searchWebLeads(),
    ]);

    const all: LeadSource[] = [
      ...(placeLeads.status  === 'fulfilled' ? placeLeads.value  : []),
      ...(permitLeads.status === 'fulfilled' ? permitLeads.value : []),
      ...(reviewLeads.status === 'fulfilled' ? reviewLeads.value : []),
      ...(webLeads.status    === 'fulfilled' ? webLeads.value    : []),
    ];

    if (placeLeads.status  === 'rejected') errors.push(`Google Places: ${placeLeads.reason}`);
    if (permitLeads.status === 'rejected') errors.push(`Permits: ${permitLeads.reason}`);
    if (reviewLeads.status === 'rejected') errors.push(`Bad Reviews: ${reviewLeads.reason}`);
    if (webLeads.status    === 'rejected') errors.push(`Web Search: ${webLeads.reason}`);

    // Filter by minimum score
    const qualified = all.filter((l) => l.score >= MIN_SCORE);

    // Import each qualified lead (skip duplicates)
    for (const lead of qualified) {
      try {
        const exists = await leadExists(lead.phone, lead.email);
        if (exists) { skipped++; continue; }

        await importLead({
          org_id: ORG_ID,
          name:   lead.name,
          phone:  lead.phone,
          email:  lead.email,
          address: lead.address,
          city:   lead.city,
          state:  lead.state ?? 'FL',
          zip:    lead.zip,
          status: 'new',
          source: lead.source,
          notes:  lead.notes,
          type:   'Homeowner',
        });
        imported++;
      } catch (err) {
        errors.push(`Import ${lead.name}: ${String(err)}`);
      }
    }

    await updateAgentRun(runId, {
      status:         imported > 0 ? 'success' : errors.length > 0 ? 'partial' : 'success',
      summary:        `Found ${all.length} leads across 4 sources. Qualified: ${qualified.length}. Imported: ${imported}. Skipped (dup): ${skipped}.`,
      leads_found:    all.length,
      leads_imported: imported,
      errors,
    });

    // WhatsApp briefing summary (will be included in Boss Agent daily report)
    if (imported > 0) {
      await alertOwner(
        `🎯 *סוכן ציד לידים* — סיים!\n\nנמצאו: ${all.length} לידים\nכשירים (ציון ≥${MIN_SCORE}): ${qualified.length}\nיובאו: ${imported} לידים חדשים\n\nבדוק את לשונית Leads ב-CRM 👆`
      );
    }

    return { found: all.length, imported, skipped, errors };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *סוכן ציד לידים* נכשל:\n${msg}`);
    return { found: 0, imported: 0, skipped: 0, errors: [msg] };
  }
}
