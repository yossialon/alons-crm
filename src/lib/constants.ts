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

export const AUTO_SEARCH_AREAS = [
  'Boca Raton','Fort Lauderdale','Miami','West Palm Beach','Tampa',
  'Coral Springs','Weston','Delray Beach','Pembroke Pines',
];

export const AUTO_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours

export const MODEL = 'claude-sonnet-4-6';

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
