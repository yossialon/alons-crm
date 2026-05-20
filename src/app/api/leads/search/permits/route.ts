import { NextRequest, NextResponse } from 'next/server';

const COUNTY_MAP: Record<string, string> = {
  'Boca Raton': 'palm-beach', 'Boynton Beach': 'palm-beach', 'Delray Beach': 'palm-beach',
  'West Palm Beach': 'palm-beach', 'Parkland': 'palm-beach',
  'Fort Lauderdale': 'broward', 'Hollywood': 'broward', 'Pompano Beach': 'broward',
  'Coral Springs': 'broward', 'Weston': 'broward', 'Plantation': 'broward',
  'Sunrise': 'broward', 'Pembroke Pines': 'broward', 'Miramar': 'broward',
  'Miami': 'miami-dade', 'Doral': 'miami-dade', 'Hialeah': 'miami-dade',
  'Kendall': 'miami-dade', 'Aventura': 'miami-dade',
  'Tampa': 'hillsborough', 'Brandon': 'hillsborough',
  'St. Petersburg': 'pinellas', 'Clearwater': 'pinellas',
  'Wesley Chapel': 'pasco', 'Naples': 'collier',
};

export async function POST(req: NextRequest) {
  const { area } = await req.json() as { area: string };
  const county = COUNTY_MAP[area] ?? 'broward';
  let leads: object[] = [];

  type RawPermit = { owner_name?: string; project_address?: string; permit_type_description?: string; issue_date?: string; contractor_name?: string };
  const normalizePermit = (p: RawPermit) => ({
    name: p.owner_name ?? p.contractor_name ?? 'Permit Holder',
    phone: '', email: '', website: '',
    area, type: 'Homeowner', source: 'Permit Records', potential: 'medium' as const, rating: '',
    notes: `${p.permit_type_description ?? 'Permit'} at ${p.project_address ?? area} — issued ${p.issue_date ? new Date(p.issue_date).toLocaleDateString() : 'recently'}`,
  });

  const KW_FILTER = "permit_type_description like '%25KITCHEN%25' OR permit_type_description like '%25REMODEL%25' OR permit_type_description like '%25RENOVATION%25' OR permit_type_description like '%25CABINET%25'";

  // Broward County: opendata.broward.org is currently DNS-unreachable — skip API attempt.
  // Palm Beach County: try their Socrata open data portal.
  try {
    if (county === 'palm-beach') {
      const url = `https://opendata.pbcgov.com/resource/p6ck-yxuw.json?$where=${KW_FILTER}&$limit=10&$order=issue_date DESC`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json() as RawPermit[];
        leads = data.map(normalizePermit);
      }
    }
  } catch { /* fall through to building-dept fallback */ }

  if (leads.length === 0) {
    const buildingDepts: Record<string, { name: string; website: string; phone: string }> = {
      'palm-beach':  { name: 'Palm Beach County Building Division',  website: 'https://discover.pbcgov.org/pzb/building/Pages/default.aspx', phone: '(561) 233-5100' },
      'broward':     { name: 'Broward County Building Code Division', website: 'https://www.broward.org/building-code/Pages/default.aspx',      phone: '(954) 765-4400' },
      'miami-dade':  { name: 'Miami-Dade Building Department',        website: 'https://www.miamidade.gov/building',                            phone: '(786) 315-2000' },
      'hillsborough':{ name: 'Hillsborough County Building Services', website: 'https://www.hillsboroughcounty.org/en/residents/property-owner/building-and-construction', phone: '(813) 272-5600' },
      'pinellas':    { name: 'Pinellas County Building Department',   website: 'https://www.pinellascounty.org/building',                       phone: '(727) 464-3888' },
      'pasco':       { name: 'Pasco County Building Services',        website: 'https://www.pascocountyfl.net/index.aspx?NID=117',              phone: '(727) 847-8009' },
      'collier':     { name: 'Collier County Building Department',    website: 'https://www.colliercountyfl.gov/government/growth-management/divisions/building-plan-review-inspection', phone: '(239) 252-2400' },
    };
    const dept = buildingDepts[county] ?? buildingDepts['broward'];
    leads = [
      {
        name: dept.name, phone: dept.phone, email: '',
        website: dept.website,
        area, type: 'Homeowner', source: 'Permit Records', potential: 'medium' as const, rating: '',
        notes: `Contact ${county} county building dept to request recent kitchen/remodel/cabinet permits in ${area}. Live permit API currently unavailable.`,
      },
    ];
  }

  return NextResponse.json({ leads });
}
