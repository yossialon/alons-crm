// ── Meta Ads Tool ─────────────────────────────────────────────────────────────
// Facebook/Instagram ad automation for Alon's Kitchens.
//
// Three campaign types:
//   createAwarenessCampaign(photoUrls?)          monthly, LEAD_GENERATION
//   createRetargetingCampaign(websiteVisitors?)   weekly,  CONVERSIONS
//   createGeoCampaign(city, zip)                  event-triggered
//
// Required env vars:
//   META_AD_ACCOUNT_ID   numeric ad account ID (no 'act_' prefix)
//   META_ACCESS_TOKEN    system user token — needs ads_management + ads_read + pages_read_engagement
//   META_PAGE_ID         Facebook Page ID used as the ad identity
//
// Optional env vars:
//   META_PIXEL_ID                  enables pixel-based optimization & retargeting audiences
//   META_RETARGETING_AUDIENCE_ID   pre-created custom audience (website visitors 30d)

import { callClaudeHaiku } from '@/agents/tools/claude';
import { alertOwner }      from '@/agents/tools/whatsapp';

// ── Credential snapshot ───────────────────────────────────────────────────────
const AD_ACCOUNT_ID           = process.env.META_AD_ACCOUNT_ID            ?? '';
const ACCESS_TOKEN            = process.env.META_ACCESS_TOKEN             ?? '';
const PAGE_ID                 = process.env.META_PAGE_ID                  ?? '';
const PIXEL_ID                = process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';
const RETARGETING_AUDIENCE_ID = process.env.META_RETARGETING_AUDIENCE_ID  ?? '';
const GOOGLE_KEY              = process.env.GOOGLE_PLACES_API_KEY         ?? '';

const API_VERSION = 'v19.0';
const BASE        = `https://graph.facebook.com/${API_VERSION}`;
const SITE_URL    = 'https://www.alonskitchens.com';

// ── Startup validation ────────────────────────────────────────────────────────
const _REQUIRED: Record<string, string> = {
  META_AD_ACCOUNT_ID: AD_ACCOUNT_ID,
  META_ACCESS_TOKEN:  ACCESS_TOKEN,
  META_PAGE_ID:       PAGE_ID,
};
const _MISSING = Object.entries(_REQUIRED).filter(([, v]) => !v).map(([k]) => k);
if (_MISSING.length) {
  console.warn(
    '[meta-ads] ⚠  Meta Ads campaigns DISABLED — add to .env.local:\n' +
    _MISSING.map((k) => `           ${k}=<your_value>`).join('\n'),
  );
}
if (!PIXEL_ID) {
  console.warn(
    '[meta-ads] ⚠  META_PIXEL_ID not set — retargeting will use interest-based audience. ' +
    'Add META_PIXEL_ID for website-visitor retargeting.',
  );
}

// ── Guard ─────────────────────────────────────────────────────────────────────
function assertConfigured(): void {
  if (_MISSING.length) {
    throw new Error(
      `Meta Ads not configured. Missing env vars: ${_MISSING.join(', ')}. ` +
      'Add them to .env.local and restart.',
    );
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MetaAdCampaign {
  campaignId:  string;
  adSetId:     string;
  creativeId:  string;
  adId:        string;
  status:      'ACTIVE' | 'PAUSED';
  dailyBudget: number;   // USD
  name:        string;
}

interface MetaError {
  message: string;
  type:    string;
  code:    number;
}

// ── Low-level API helpers ─────────────────────────────────────────────────────

async function metaPost(path: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...params, access_token: ACCESS_TOKEN }),
  });
  const data = await res.json() as Record<string, unknown> & { error?: MetaError };
  if (data.error) {
    const e = data.error;
    throw new Error(`Meta API [${e.code} ${e.type}]: ${e.message}`);
  }
  return data;
}

async function metaGet(path: string, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res  = await fetch(url.toString());
  const data = await res.json() as Record<string, unknown> & { error?: MetaError };
  if (data.error) {
    const e = data.error;
    throw new Error(`Meta API [${e.code} ${e.type}]: ${e.message}`);
  }
  return data;
}

// ── Interest lookup (cached per process) ─────────────────────────────────────
// Module-level cache — interests are stable across requests in the same process.
let _interestCache: { id: string; name: string }[] | null = null;

async function getHomeRenovationInterests(): Promise<{ id: string; name: string }[]> {
  if (_interestCache) return _interestCache;

  const queries = ['Home renovation', 'Interior design', 'Luxury homes', 'Kitchen remodeling'];
  const results: { id: string; name: string }[] = [];

  await Promise.allSettled(
    queries.map(async (q) => {
      try {
        const data = await metaGet('/search', { type: 'adinterest', q });
        const hits = (data.data as Array<{ id: string; name: string }> | undefined) ?? [];
        if (hits[0]) results.push({ id: hits[0].id, name: hits[0].name });
      } catch {
        // silently skip — campaign will run without this interest
      }
    }),
  );

  _interestCache = results;
  return results;
}

// ── Geocoding (zip → lat/lng via Google Geocoding API) ────────────────────────
async function geocodeZip(zip: string, state = 'FL'): Promise<{ lat: number; lng: number }> {
  if (!GOOGLE_KEY) throw new Error('GOOGLE_PLACES_API_KEY is required for geo-campaign zip geocoding');

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', `${zip},${state},USA`);
  url.searchParams.set('key', GOOGLE_KEY);

  const res  = await fetch(url.toString());
  const data = await res.json() as {
    results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    status:   string;
  };
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) throw new Error(`Could not geocode zip ${zip} (Google status: ${data.status})`);
  return { lat: loc.lat, lng: loc.lng };
}

// ── Targeting specs ───────────────────────────────────────────────────────────
// South Florida: three overlapping circles covering Miami-Dade, Broward, Palm Beach
const SOUTH_FL_LOCATIONS = [
  { latitude: 25.7617, longitude: -80.1918, radius: 50, distance_unit: 'mile', name: 'Miami-Dade' },
  { latitude: 26.1224, longitude: -80.1373, radius: 40, distance_unit: 'mile', name: 'Broward' },
  { latitude: 26.7153, longitude: -80.0534, radius: 30, distance_unit: 'mile', name: 'Palm Beach' },
];

async function buildSouthFLTargeting(ageMin = 35, ageMax = 65): Promise<Record<string, unknown>> {
  const interests = await getHomeRenovationInterests();
  return {
    age_min:         ageMin,
    age_max:         ageMax,
    geo_locations:   { custom_locations: SOUTH_FL_LOCATIONS },
    flexible_spec:   interests.length > 0 ? [{ interests }] : undefined,
  };
}

function buildGeoTargeting(lat: number, lng: number, radiusMi: number): Record<string, unknown> {
  return {
    age_min:       35,
    age_max:       65,
    geo_locations: {
      custom_locations: [{ latitude: lat, longitude: lng, radius: radiusMi, distance_unit: 'mile' }],
    },
  };
}

// ── Deduplication: check for recent geo campaign for the same city ────────────
async function findExistingGeoCampaign(city: string): Promise<string | null> {
  try {
    const campaignName = `[GEO] ${city}`;
    const data = await metaGet(`/act_${AD_ACCOUNT_ID}/campaigns`, {
      fields:    'id,name,status,created_time',
      filtering: JSON.stringify([{ field: 'name', operator: 'CONTAIN', value: campaignName }]),
      limit:     '10',
    });
    const campaigns = (data.data as Array<{ id: string; name: string; status: string; created_time: string }> | undefined) ?? [];

    // Consider any ACTIVE/PAUSED geo campaign created in the last 8 days as a duplicate
    const cutoff = Date.now() - 8 * 86_400_000;
    for (const c of campaigns) {
      if (['ACTIVE', 'PAUSED'].includes(c.status) && new Date(c.created_time).getTime() > cutoff) {
        return c.id;
      }
    }
  } catch {
    // If the API call fails, don't block campaign creation
  }
  return null;
}

// ── Ad creative helpers ───────────────────────────────────────────────────────

/** Build a carousel creative spec from photo URLs + captions */
function buildCarouselCreativeSpec(
  mainCaption:      string,
  cards: Array<{ imageUrl: string; headline: string; description: string }>,
): Record<string, unknown> {
  return {
    object_story_spec: {
      page_id:   PAGE_ID,
      link_data: {
        message: mainCaption,
        link:    SITE_URL,
        child_attachments: cards.map((c) => ({
          link:         SITE_URL,
          image_url:    c.imageUrl,
          name:         c.headline,
          description:  c.description,
          call_to_action: { type: 'LEARN_MORE', value: { link: SITE_URL } },
        })),
        call_to_action: { type: 'LEARN_MORE', value: { link: SITE_URL } },
      },
    },
  };
}

/** Build a single-image or link-only creative spec */
function buildSingleImageCreativeSpec(
  caption:   string,
  headline:  string,
  imageUrl?: string,
): Record<string, unknown> {
  return {
    object_story_spec: {
      page_id:   PAGE_ID,
      link_data: {
        message:     caption,
        link:        SITE_URL,
        name:        headline,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        call_to_action: { type: 'LEARN_MORE', value: { link: SITE_URL } },
      },
    },
  };
}

// ── Shared campaign builder ───────────────────────────────────────────────────
interface CampaignBlueprint {
  name:             string;
  objective:        string;    // 'OUTCOME_LEADS' | 'OUTCOME_SALES'
  optimizationGoal: string;    // 'LEAD_GENERATION' | 'OFFSITE_CONVERSIONS' | 'LINK_CLICKS'
  dailyBudgetUsd:   number;
  targeting:        Record<string, unknown>;
  creativeSpec:     Record<string, unknown>;
  status:           'ACTIVE' | 'PAUSED';
  endTime?:         string;    // ISO string — for time-bounded campaigns
}

async function buildCampaign(bp: CampaignBlueprint): Promise<MetaAdCampaign> {
  const act = `act_${AD_ACCOUNT_ID}`;

  // 1 — Campaign
  const campaign = await metaPost(`/${act}/campaigns`, {
    name:                  bp.name,
    objective:             bp.objective,
    status:                bp.status,
    special_ad_categories: [],
    buying_type:           'AUCTION',
  });
  const campaignId = campaign.id as string;

  // 2 — Ad Set
  const adSetParams: Record<string, unknown> = {
    name:              `${bp.name} — Ad Set`,
    campaign_id:       campaignId,
    daily_budget:      Math.round(bp.dailyBudgetUsd * 100),  // cents
    billing_event:     'IMPRESSIONS',
    optimization_goal: bp.optimizationGoal,
    bid_strategy:      'LOWEST_COST_WITHOUT_CAP',
    targeting:         bp.targeting,
    status:            bp.status,
  };
  // Attach pixel as promoted_object when available for conversion-optimised campaigns
  if (PIXEL_ID && ['LEAD_GENERATION', 'OFFSITE_CONVERSIONS'].includes(bp.optimizationGoal)) {
    adSetParams.promoted_object = {
      pixel_id:          PIXEL_ID,
      custom_event_type: bp.optimizationGoal === 'OFFSITE_CONVERSIONS' ? 'PURCHASE' : 'LEAD',
    };
  }
  if (bp.endTime) adSetParams.end_time = bp.endTime;

  const adSet  = await metaPost(`/${act}/adsets`, adSetParams);
  const adSetId = adSet.id as string;

  // 3 — Creative
  const creative   = await metaPost(`/${act}/adcreatives`, { name: `${bp.name} — Creative`, ...bp.creativeSpec });
  const creativeId  = creative.id as string;

  // 4 — Ad
  const ad   = await metaPost(`/${act}/ads`, {
    name:     `${bp.name} — Ad`,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status:   bp.status,
  });
  const adId = ad.id as string;

  return { campaignId, adSetId, creativeId, adId, status: bp.status, dailyBudget: bp.dailyBudgetUsd, name: bp.name };
}

// ── 1. Awareness Campaign (monthly) ──────────────────────────────────────────
/**
 * Monthly brand/lead-gen campaign targeting homeowners 35-65 in South Florida.
 * Objective: OUTCOME_LEADS. Budget: $10/day. Status: PAUSED (owner review first).
 *
 * @param photoUrls  Public HTTPS image URLs to use in a carousel. If omitted,
 *                   creates a single link-based ad instead of a carousel.
 */
export async function createAwarenessCampaign(photoUrls: string[] = []): Promise<MetaAdCampaign> {
  assertConfigured();

  const now      = new Date();
  const monthStr = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const name     = `[Awareness] Alon's Kitchens — ${monthStr}`;

  // Generate captions via Claude
  let mainCaption: string;
  let cards: Array<{ imageUrl: string; headline: string; description: string }> = [];

  if (photoUrls.length > 0) {
    // Carousel: one caption per photo
    const raw = await callClaudeHaiku([{
      role:    'user',
      content: `Write a luxury kitchen cabinet Instagram carousel for Alon's Kitchens in South Florida.
Generate exactly ${photoUrls.length} cards, then one main caption (max 100 words).
Each card needs: headline (5 words max), description (12 words max).

Format as JSON only:
{
  "mainCaption": "...",
  "cards": [{"headline": "...", "description": "..."}]
}
Tone: aspirational luxury. Hashtags in mainCaption: #AlonsKitchens #SouthFlorida #LuxuryKitchen #CustomCabinets`,
    }]);

    try {
      const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as {
        mainCaption?: string;
        cards?:       Array<{ headline: string; description: string }>;
      };
      mainCaption = parsed.mainCaption ?? `✨ Luxury kitchen transformations in South Florida. See what Alon's Kitchens can do for your home. Visit alonskitchens.com`;
      cards = (parsed.cards ?? []).slice(0, photoUrls.length).map((c, i) => ({
        imageUrl:    photoUrls[i],
        headline:    c.headline,
        description: c.description,
      }));
      // Pad if Claude returned fewer cards than photos
      while (cards.length < photoUrls.length) {
        cards.push({ imageUrl: photoUrls[cards.length], headline: 'Custom Kitchen Cabinets', description: 'Luxury craftsmanship for South Florida homes' });
      }
    } catch {
      mainCaption = '✨ Custom luxury kitchen cabinets in South Florida. Alon\'s Kitchens transforms your home. Visit alonskitchens.com';
      cards = photoUrls.map((url) => ({ imageUrl: url, headline: 'Custom Kitchen Cabinets', description: 'Luxury craftsmanship in South Florida' }));
    }
  } else {
    // No photos — single link ad
    mainCaption = await callClaudeHaiku([{
      role:    'user',
      content: `Write a short Facebook/Instagram ad caption for Alon's Kitchens (luxury custom kitchen cabinets, South Florida).
Max 80 words. Start with an emoji. Mention free design consultation. End with alonskitchens.com.
Hashtags: #AlonsKitchens #SouthFlorida #LuxuryKitchen #CustomCabinets
Return ONLY the caption text, no JSON.`,
    }]);
  }

  const targeting   = await buildSouthFLTargeting(35, 65);
  const creativeSpec = photoUrls.length > 0
    ? buildCarouselCreativeSpec(mainCaption, cards)
    : buildSingleImageCreativeSpec(mainCaption, 'Custom Kitchen Cabinets | Alon\'s Kitchens');

  const campaign = await buildCampaign({
    name,
    objective:        'OUTCOME_LEADS',
    optimizationGoal: PIXEL_ID ? 'LEAD_GENERATION' : 'LINK_CLICKS',
    dailyBudgetUsd:   10,
    targeting,
    creativeSpec,
    status:           'PAUSED',
  });

  await alertOwner(
    `📢 *Ad Machine* — קמפיין מודעות חודשי נוצר!\n\n*שם:* ${name}\n*תקציב:* $10/יום\n*סטטוס:* עצור לבדיקה\n\nהפעל ב-Meta Ads Manager לאחר אישור. 👆`,
  );

  return campaign;
}

// ── 2. Retargeting Campaign (weekly) ─────────────────────────────────────────
/**
 * Weekly retargeting campaign for visitors/lookalikes.
 * Objective: OUTCOME_SALES. Budget: $5/day. Status: PAUSED (owner review first).
 *
 * @param websiteVisitors  true → use website-visitor custom audience (requires
 *                         META_RETARGETING_AUDIENCE_ID or META_PIXEL_ID).
 *                         false → lookalike audience (falls back to interest targeting
 *                         if no audience is configured).
 * @param beforePhotoUrl   Optional before photo for transformation creative.
 * @param afterPhotoUrl    Optional after photo for transformation creative.
 */
export async function createRetargetingCampaign(
  websiteVisitors  = true,
  beforePhotoUrl?: string,
  afterPhotoUrl?:  string,
): Promise<MetaAdCampaign> {
  assertConfigured();

  const weekStr = new Date().toISOString().slice(0, 10);
  const name    = `[Retargeting] Alon's Kitchens — ${weekStr}`;

  // Generate caption
  const caption = await callClaudeHaiku([{
    role:    'user',
    content: `Write a retargeting ad caption for homeowners who visited alonskitchens.com but haven't contacted us yet.
Max 70 words. Mention they were "looking at kitchen cabinets". Include urgency + free consultation offer.
Tone: warm, not pushy. Hashtags: #AlonsKitchens #SouthFlorida #LuxuryKitchen
Return ONLY the caption text.`,
  }]);

  // Determine audience
  let customAudiences: Array<{ id: string }> | undefined;
  if (websiteVisitors && RETARGETING_AUDIENCE_ID) {
    customAudiences = [{ id: RETARGETING_AUDIENCE_ID }];
  } else if (!websiteVisitors && RETARGETING_AUDIENCE_ID) {
    // Lookalike: attempt to create from the configured source audience
    try {
      const lookalike = await metaPost(`/act_${AD_ACCOUNT_ID}/customaudiences`, {
        name:            `Lookalike — Alon's Kitchens Past Leads`,
        subtype:         'LOOKALIKE',
        origin_audience_id: RETARGETING_AUDIENCE_ID,
        lookalike_spec:  JSON.stringify({ country: 'US', ratio: 0.01 }),  // top 1%
      });
      customAudiences = [{ id: lookalike.id as string }];
    } catch (err) {
      console.warn('[meta-ads] Lookalike audience creation failed, falling back to interests:', err);
    }
  }
  // If no audience configured, fall back to interest-based targeting (same South FL targeting)

  const baseTargeting  = await buildSouthFLTargeting(35, 65);
  const targeting: Record<string, unknown> = {
    ...baseTargeting,
    ...(customAudiences ? { custom_audiences: customAudiences } : {}),
  };

  // Use after photo if available, otherwise before/after together or link-only
  const heroPhoto  = afterPhotoUrl ?? beforePhotoUrl;
  const headline   = 'Your Dream Kitchen Awaits — Free Consultation';
  const creativeSpec = buildSingleImageCreativeSpec(caption, headline, heroPhoto);

  const campaign = await buildCampaign({
    name,
    objective:        'OUTCOME_SALES',
    optimizationGoal: PIXEL_ID ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS',
    dailyBudgetUsd:   5,
    targeting,
    creativeSpec,
    status:           'PAUSED',
  });

  const audienceNote = customAudiences
    ? `קהל: ${websiteVisitors ? 'מבקרי אתר' : 'lookalike'}`
    : 'קהל: תחומי עניין (לא הוגדר META_RETARGETING_AUDIENCE_ID)';

  await alertOwner(
    `🎯 *Ad Machine* — קמפיין ריטרגטינג שבועי נוצר!\n\n*שם:* ${name}\n*תקציב:* $5/יום\n*${audienceNote}*\n*סטטוס:* עצור לבדיקה\n\nהפעל ב-Meta Ads Manager. 👆`,
  );

  return campaign;
}

// ── 3. Geo Campaign (event-triggered) ────────────────────────────────────────
/**
 * Hyper-local lead-gen campaign triggered after leads are imported from a new city.
 * Objective: OUTCOME_LEADS. Budget: $3/day for 7 days. Status: ACTIVE immediately.
 *
 * Deduplicates: if an active/paused geo campaign for the same city was created in
 * the past 8 days, returns the existing campaign ID and skips creation.
 *
 * @param city  City name (e.g. "Fort Lauderdale")
 * @param zip   5-digit US zip code — geocoded to lat/lon for radius targeting
 */
export async function createGeoCampaign(city: string, zip: string): Promise<MetaAdCampaign & { skipped?: boolean }> {
  assertConfigured();

  const name = `[GEO] ${city} — Kitchen Cabinets`;

  // ── Deduplication ──────────────────────────────────────────────────────────
  const existingId = await findExistingGeoCampaign(city);
  if (existingId) {
    console.log(`[meta-ads] Skipping geo campaign for ${city} — active campaign ${existingId} already exists`);
    return {
      campaignId: existingId, adSetId: '', creativeId: '', adId: '',
      status: 'ACTIVE', dailyBudget: 3, name, skipped: true,
    };
  }

  // ── Geocode zip ────────────────────────────────────────────────────────────
  const { lat, lng } = await geocodeZip(zip);

  // ── Generate city-specific caption ────────────────────────────────────────
  const caption = await callClaudeHaiku([{
    role:    'user',
    content: `Write a short Facebook ad for Alon's Kitchens targeting homeowners in ${city}, Florida.
Max 50 words. Lead with the city name. Mention free design consultation. End with alonskitchens.com.
Tone: local and direct.
Return ONLY the ad text, no JSON or hashtags.`,
  }]);

  const headline = `Kitchen Cabinets in ${city} — Free Design Consultation`;

  // ── Build campaign ─────────────────────────────────────────────────────────
  const endTime = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const campaign = await buildCampaign({
    name,
    objective:        'OUTCOME_LEADS',
    optimizationGoal: PIXEL_ID ? 'LEAD_GENERATION' : 'LINK_CLICKS',
    dailyBudgetUsd:   3,
    targeting:        buildGeoTargeting(lat, lng, 10),
    creativeSpec:     buildSingleImageCreativeSpec(caption, headline),
    status:           'ACTIVE',   // small budget, fast local response — run immediately
    endTime,
  });

  await alertOwner(
    `📍 *Ad Machine* — קמפיין גיאוגרפי הופעל!\n\n*עיר:* ${city} (${zip})\n*תקציב:* $3/יום × 7 ימים\n*סטטוס:* פעיל כעת\n\nקמפיין זה הופעל אוטומטית לאחר שיובאו לידים מ-${city}. 🗺️`,
  );

  return campaign;
}
