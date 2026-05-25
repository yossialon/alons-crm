// ── Lead Hunter Agent ─────────────────────────────────────────────────────────
// Runs daily at 7 AM. Searches 4 sources for high-quality leads in South FL.
// Scores each lead ≥ LEAD_MIN_SCORE before importing.

import { logAgentRun, updateAgentRun, leadExists, importLead } from '@/agents/tools/database';
import { callClaudeHaiku, callClaudeWithWebSearch, extractJsonArray } from '@/agents/tools/claude';
import { alertOwner } from '@/agents/tools/whatsapp';
import { searchPermitsByCounty } from '@/lib/permits';
import { log } from '@/lib/logger';
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
          score:   heuristicScore({ hasPhone: !!place.formatted_phone_number, hasAddress: !!place.formatted_address, type: 'contractor' }),
          notes:   `Google rating: ${place.rating ?? 'N/A'} (${place.user_ratings_total ?? 0} reviews)`,
        });
      }
    } catch (err) {
      log.error('[lead-hunter] Google Places error', err);
    }
  }

  return leads;
}

// ── Source 2: FL Permit Search via shared lib (direct call, no HTTP round-trip) ─
async function searchPermits(): Promise<LeadSource[]> {
  const leads: LeadSource[] = [];
  // Three key South FL counties; each call is independent and external-API-based
  const counties: Array<{ county: string; area: string }> = [
    { county: 'broward',    area: 'Fort Lauderdale' },
    { county: 'miami-dade', area: 'Miami' },
    { county: 'palm-beach', area: 'Boca Raton' },
  ];

  await Promise.allSettled(
    counties.map(async ({ county, area }) => {
      try {
        const permits = await searchPermitsByCounty(county, area);
        for (const p of permits.slice(0, 3)) {
          leads.push({
            name:    p.name,
            address: p.notes,          // notes contains the address from the permit
            source:  `FL Permit — ${county}`,
            score:   heuristicScore({ hasAddress: true, type: 'homeowner', hasPermit: true }),
            notes:   p.notes,
          });
        }
      } catch (err) {
        log.error(`[lead-hunter] Permit search error (${county})`, err);
      }
    }),
  );

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

    const raw     = await callClaudeWithWebSearch(prompt);
    const reviews = extractJsonArray<{ name?: string; city?: string; competitor?: string; complaint?: string }>(raw);
    if (!reviews) { log.warn('[lead-hunter] Bad review search: no JSON array in response'); return []; }

    return reviews.slice(0, 5).map((r) => ({
      name:   r.name ?? 'Unhappy Customer',
      city:   r.city,
      source: `Competitor Review — ${r.competitor ?? 'Unknown'}`,
      score:  heuristicScore({ type: 'homeowner', hasComplaint: true }),
      notes:  `Unhappy with competitor: ${r.competitor}. Complaint: ${r.complaint}`,
    }));
  } catch (err) {
    log.error('[lead-hunter] Bad review search error', err);
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

    const raw     = await callClaudeWithWebSearch(prompt);
    const results = extractJsonArray<{ name?: string; city?: string; source_platform?: string; context?: string }>(raw);
    if (!results) { log.warn('[lead-hunter] Web lead search: no JSON array in response'); return []; }

    return results.slice(0, 5).map((r) => ({
      name:   r.name ?? 'Homeowner',
      city:   r.city,
      source: `Web Search — ${r.source_platform ?? 'Social'}`,
      score:  heuristicScore({ type: 'homeowner', hasWebPresence: true }),
      notes:  r.context,
    }));
  } catch (err) {
    log.error('[lead-hunter] Web lead search error', err);
    return [];
  }
}

// ── Heuristic scoring (fallback only) ────────────────────────────────────────
// scoreLeadsWithAI() replaces these values on the happy path.
// This function is only the final answer when the AI call fails.
function heuristicScore(factors: {
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

// ── AI-powered batch scoring ──────────────────────────────────────────────────

interface AiScore {
  index:  number;
  score:  number;
  reason: string;
}

interface ScoringResult {
  /** Leads with .score replaced by Claude's score and reason appended to .notes */
  leads:    LeadSource[];
  /** Full scoring output — stored in agent_runs.metadata for caching & auditing */
  metadata: Record<string, unknown>;
}

/**
 * Send all collected leads to Claude in a single batch call.
 * Returns enriched leads (AI score + reason) and metadata for the agent run.
 *
 * On any failure the function logs the error and returns the original leads
 * with their heuristic scores so the hunter can still run end-to-end.
 */
async function scoreLeadsWithAI(leads: LeadSource[]): Promise<ScoringResult> {
  if (leads.length === 0) {
    return { leads, metadata: { ai_scoring: { status: 'skipped', reason: 'no leads collected' } } };
  }

  // Compact representation: strip actual PII values — only send signal-bearing fields
  const compactLeads = leads.map((l, i) => ({
    index:       i,
    name:        l.name,
    source:      l.source,
    city:        l.city   ?? null,
    has_phone:   !!l.phone,
    has_email:   !!l.email,
    has_address: !!l.address,
    notes:       l.notes  ?? null,
  }));

  const prompt = `You are a lead qualification expert for Alon's Kitchens — a luxury custom kitchen cabinet company serving South Florida (Broward, Miami-Dade, Palm Beach counties).

Business context:
- Product: custom luxury kitchen cabinets, typical project $50,000–$200,000
- Ideal customer: homeowner currently planning or mid-renovation with budget allocated
- Service area: South Florida only
- Disqualifiers: commercial/rental properties, outside service area, no purchase intent

Score each lead 0–100 on likelihood to become a paying customer:
  90–100  Active renovation + budget signals + direct contact info
  70–89   Strong homeowner intent with some friction (missing contact or unclear timing)
  50–69   Adjacent intent or limited info (renovation-adjacent, no direct contact)
  30–49   Weak — low purchase intent or indirect signal
   0–29   Poor fit — commercial, out of area, competitor, or no meaningful signal

Leads to evaluate:
${JSON.stringify(compactLeads, null, 2)}

Return ONLY a valid JSON array — one entry per lead, in the same order as the input:
[{"index":0,"score":85,"reason":"<concise reason, ≤20 words>"},...]`;

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  try {
    const raw        = await callClaudeHaiku([{ role: 'user', content: prompt }]);
    const durationMs = Date.now() - t0;

    const aiScores   = extractJsonArray<AiScore>(raw);
    if (!aiScores) throw new Error(`No JSON array in scoring response. Raw: ${raw.slice(0, 200)}`);

    // Index-keyed lookup for O(1) access
    const scoreMap = new Map<number, AiScore>();
    for (const s of aiScores) {
      if (typeof s.index === 'number' && typeof s.score === 'number') {
        scoreMap.set(s.index, s);
      }
    }

    // Merge AI scores back into leads
    const scoredLeads = leads.map((lead, i): LeadSource => {
      const ai = scoreMap.get(i);
      if (!ai) return lead; // AI skipped this index — keep heuristic score
      return {
        ...lead,
        score: Math.max(0, Math.min(100, Math.round(ai.score))),
        // Append reason to notes so it's visible in the CRM lead detail
        notes: [lead.notes, ai.reason ? `AI: ${ai.reason}` : null]
          .filter(Boolean)
          .join(' | ') || undefined,
      };
    });

    return {
      leads: scoredLeads,
      metadata: {
        ai_scoring: {
          status:       'success',
          model:        'claude-haiku-4-5-20251001',
          leads_scored: aiScores.length,
          duration_ms:  durationMs,
          scored_at:    startedAt,
          scores:       aiScores,   // ← full cache of every (index, score, reason)
        },
      },
    };
  } catch (err) {
    // Graceful degradation — heuristic scores remain in place
    log.error('[lead-hunter] AI scoring failed, falling back to heuristic scores', err);
    return {
      leads,
      metadata: {
        ai_scoring: {
          status:    'fallback',
          error:     String(err),
          scored_at: startedAt,
        },
      },
    };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function runLeadHunter(trigger: 'cron' | 'manual' = 'cron'): Promise<{
  found:        number;
  imported:     number;
  skipped:      number;
  errors:       string[];
  /** Distinct city+zip combos from newly imported leads — used for geo ad targeting. */
  newLocations: Array<{ city: string; zip: string }>;
}> {
  const runId = await logAgentRun('lead-hunter', trigger);
  const errors:       string[] = [];
  const newLocations: Array<{ city: string; zip: string }> = [];
  const _seenLocKeys  = new Set<string>();
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

    // ── AI batch scoring ────────────────────────────────────────────────────
    // Replaces each lead's heuristic .score with Claude's score.
    // Falls back to heuristic scores silently if the API call fails.
    const { leads: scoredLeads, metadata: scoringMeta } = await scoreLeadsWithAI(all);

    // Filter by minimum score (now using AI scores on the happy path)
    const qualified = scoredLeads.filter((l) => l.score >= MIN_SCORE);

    // Import each qualified lead (skip duplicates)
    for (const lead of qualified) {
      try {
        const exists = await leadExists(lead.phone, lead.email);
        if (exists) { skipped++; continue; }

        await importLead({
          org_id:  ORG_ID,
          name:    lead.name,
          phone:   lead.phone,
          email:   lead.email,
          address: lead.address,
          city:    lead.city,
          state:   lead.state ?? 'FL',
          zip:     lead.zip,
          status:  'new',
          source:  lead.source,
          notes:   lead.notes,   // includes "AI: <reason>" suffix after scoring
          type:    'Homeowner',
        });
        imported++;

        // Track distinct city+zip pairs for geo ad targeting.
        // Both city AND zip are required — zip is geocoded to lat/lon in meta-ads.ts.
        if (lead.city && lead.zip) {
          const locKey = `${lead.city.toLowerCase()}:${lead.zip}`;
          if (!_seenLocKeys.has(locKey)) {
            _seenLocKeys.add(locKey);
            newLocations.push({ city: lead.city, zip: lead.zip });
          }
        }
      } catch (err) {
        errors.push(`Import ${lead.name}: ${String(err)}`);
      }
    }

    await updateAgentRun(runId, {
      status:         imported > 0 ? 'success' : errors.length > 0 ? 'partial' : 'success',
      summary:        `Found ${all.length} leads across 4 sources. Qualified (AI score ≥${MIN_SCORE}): ${qualified.length}. Imported: ${imported}. Skipped (dup): ${skipped}.`,
      leads_found:    all.length,
      leads_imported: imported,
      errors,
      metadata:       scoringMeta,  // cached AI scoring result
    });

    // WhatsApp briefing summary (will be included in Boss Agent daily report)
    if (imported > 0) {
      await alertOwner(
        `🎯 *סוכן ציד לידים* — סיים!\n\nנמצאו: ${all.length} לידים\nכשירים (ציון ≥${MIN_SCORE}): ${qualified.length}\nיובאו: ${imported} לידים חדשים\n\nבדוק את לשונית Leads ב-CRM 👆`
      );
    }

    return { found: all.length, imported, skipped, errors, newLocations };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *סוכן ציד לידים* נכשל:\n${msg}`);
    return { found: 0, imported: 0, skipped: 0, errors: [msg], newLocations: [] };
  }
}
