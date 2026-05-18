export const AREAS = [
  'Boca Raton','Miami','Fort Lauderdale','Boynton Beach','Pompano Beach',
  'Coral Springs','Hollywood','Aventura','Tampa','Delray Beach',
  'West Palm Beach','Parkland','Weston','Naples','Plantation',
  'Doral','Hialeah','Kendall','Sunrise','Pembroke Pines',
  'Miramar','St. Petersburg','Clearwater','Brandon','Wesley Chapel',
];

export const LEAD_TYPES = ['Homeowner', 'Contractor', 'Developer'];
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed'] as const;

export const SOURCES = [
  'Manual','Google Maps','Referral','Web Form','LinkedIn',
  'Social Media','Nextdoor','Facebook Groups','Reddit','Instagram',
  'Houzz','Auto-Scan',
];

export const SUPPLIER_CATS = [
  'Wood & MDF','Hardware','Laminates','Paint & Finish','Countertops','Appliances','Other',
];

export const MODEL = 'claude-sonnet-4-5';

export function buildContractorPrompt(area: string) {
  return `You are a lead generation specialist for Alon's Kitchens, a custom cabinet manufacturer in South Florida. Use web search to find REAL, CURRENTLY ACTIVE kitchen remodeling contractors and general contractors in ${area}, Florida.

Search for:
1. Google Maps listings: search "kitchen remodeling contractor ${area} FL" and "general contractor ${area} Florida"
2. Houzz pro directory: search "Houzz kitchen remodeler ${area} Florida"
3. Angi/HomeAdvisor listings: search "kitchen remodel ${area} FL site:angi.com OR site:homeadvisor.com"
4. Local Facebook business pages: search "kitchen remodeling ${area} FL Facebook"
5. BBB listings: search "kitchen cabinet contractor ${area} FL site:bbb.org"

Return ONLY a raw JSON array (no markdown) of up to 8 real businesses found:
[{
  "name": "Actual business name",
  "phone": "Real phone number or empty string",
  "email": "Real email or empty string",
  "website": "Real website URL or empty string",
  "area": "${area}",
  "type": "Contractor",
  "source": "Where you found them (e.g. Google Maps, Houzz)",
  "rating": "Their rating if found or empty string",
  "potential": "high or medium or low",
  "notes": "Specific details about the business"
}]`;
}

export function buildHomeownerPrompt(area: string) {
  return `You are a lead generation specialist for Alon's Kitchens, a custom cabinet company in South Florida. Find REAL homeowners in ${area}, Florida actively seeking kitchen renovations in 2025-2026.

Search:
1. Nextdoor posts: "Nextdoor ${area} kitchen remodel contractor recommendation 2025"
2. Reddit: "site:reddit.com ${area} kitchen remodel 2025"
3. Houzz: "Houzz ${area} Florida kitchen remodel questions 2025"
4. Facebook groups: "${area} FL kitchen renovation recommendation 2025"
5. Permit filings: "${area} Florida building permit kitchen remodel 2025"

Return ONLY a raw JSON array (no markdown) of up to 8 leads:
[{
  "name": "Real name if found, or 'Nextdoor user - ${area}'",
  "phone": "Real phone if found or empty string",
  "email": "Real email if found or empty string",
  "website": "",
  "area": "${area}",
  "type": "Homeowner",
  "source": "Exact platform and detail",
  "rating": "",
  "potential": "high, medium, or low",
  "notes": "What they posted, when, what they need, budget if mentioned"
}]`;
}

export function buildDeveloperPrompt(area: string) {
  return `You are a lead generation specialist for Alon's Kitchens. Find REAL real estate developers and builders with active residential projects in ${area}, Florida in 2025-2026 that need kitchen cabinets.

Search:
1. New construction permits: "${area} Florida new residential construction permit 2025"
2. Active developments: "new homes ${area} FL 2025 developer builder"
3. LinkedIn: "site:linkedin.com real estate developer ${area} Florida residential 2025"
4. Local news: "${area} Florida new residential development 2025"
5. Zillow/Realtor: "site:zillow.com new construction ${area} FL 2025"

Return ONLY a raw JSON array (no markdown) of up to 8 developers:
[{
  "name": "Actual company or developer name",
  "phone": "Real phone or empty string",
  "email": "Real email or empty string",
  "website": "Real website URL or empty string",
  "area": "${area}",
  "type": "Developer",
  "source": "Where you found them",
  "rating": "",
  "potential": "high, medium, or low",
  "notes": "Project details — units, name, timeline, location"
}]`;
}

export function buildAutoPrompt(area: string) {
  return `You are a lead researcher for Alon's Kitchens, a custom kitchen cabinet company in South Florida (954-859-9046). Search for the highest-quality leads in ${area}, Florida actively in the market for kitchen cabinets or remodeling in 2025-2026.

Search across:
- Google Maps: "kitchen remodeling ${area} FL"
- Nextdoor/Facebook: "${area} Florida kitchen remodel recommendation 2025"
- Reddit: "reddit ${area} OR south florida kitchen cabinet 2025"
- Houzz: "houzz ${area} Florida kitchen remodel professional"
- New construction: "${area} FL new homes developer 2025"
- Permits: "${area} Florida kitchen permit 2025"

Return ONLY a raw JSON array of 5 leads (no markdown):
[{
  "name": "Real name or business",
  "phone": "Real number or empty string",
  "email": "Real email or empty string",
  "website": "Real URL or empty string",
  "area": "${area}",
  "type": "Homeowner | Contractor | Developer",
  "source": "Exact source (e.g. Google Maps, Nextdoor)",
  "potential": "high | medium | low",
  "notes": "Specific reason this is a good lead"
}]`;
}

export function buildAuditPrompt(city: string, services: string, budget: string) {
  return `You are an expert Lead Generation Specialist auditing lead channels for **Alon's Kitchens** — a custom cabinet manufacturer in ${city}, Florida. Services: ${services}. Monthly lead budget: ${budget}.

Use web search extensively across all four phases. Be specific and cite real URLs/posts wherever found.

## PHASE 1 — AUDIT LEAD SOURCES
Search each channel for kitchen cabinet / remodeling leads in ${city} FL. Report ✅ Working | ⚠️ Partial | ❌ Broken.

Channels to check (search each one):
- Facebook Groups — search "kitchen remodel ${city} FL Facebook group 2025"
- Nextdoor — search "Nextdoor ${city} Florida kitchen remodel recommendation 2025"
- Reddit — search "site:reddit.com ${city} kitchen cabinet remodel 2025"
- Houzz — search "Houzz kitchen remodeler ${city} Florida"
- Angi/HomeAdvisor — search "kitchen remodel ${city} FL site:angi.com"
- Google Maps — search "kitchen remodeling contractor ${city} FL"
- Craigslist — search "craigslist ${city} FL kitchen remodel services wanted"
- BBB — search "kitchen contractor ${city} FL site:bbb.org"
- LinkedIn — search "site:linkedin.com kitchen remodel contractor ${city} Florida"
- Building Permits — search "${city} Florida kitchen remodel permit 2025"

## PHASE 2 — FIND ACTIVE LEADS RIGHT NOW
Search for real, active homeowners or contractors in ${city} and South Florida looking for kitchen cabinets or a remodeling contractor in the last 30–60 days. Use searches like:
- "need kitchen cabinet contractor South Florida 2025"
- "kitchen remodel ${city} recommendation Reddit OR Nextdoor"
- "looking for kitchen contractor Fort Lauderdale OR Boca Raton"
- "Houzz ${city} FL kitchen questions 2025"

Return a markdown table of every real lead found:
| # | Name/Handle | Platform | Post Summary | Service Needed | Location | Date | Priority |

Priority: 🔴 HIGH (urgent + specific), 🟡 MEDIUM (general interest), 🟢 LOW (early research)

## PHASE 3 — ONLINE PRESENCE CHECK
Search for Alon's Kitchens specifically:
- Google search "Alon's Kitchens ${city} Florida" — any listings found?
- Houzz profile search "Alon's Kitchens"
- Google Maps listing
- Yelp listing
- Any reviews or mentions online

Report what's found and what's missing.

## PHASE 4 — REPORT & RECOMMENDATIONS
1. **Summary Dashboard** — channels working vs broken (count)
2. **Top Leads** — best opportunities from Phase 2, ranked by priority
3. **Quick Wins** — 3 concrete actions to get more leads THIS WEEK in ${city}
4. **Fix List** — what broken channels to fix first and how
5. **Highest-ROI Channel** — single best channel for a South Florida cabinet company to invest in

Format the entire response in clean markdown with headers, tables, and emoji status indicators.`;
}
