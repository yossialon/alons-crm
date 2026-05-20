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

  try {
    if (county === 'broward') {
      const url = `https://opendata.broward.org/resource/r6dm-gkm8.json?$where=${KW_FILTER}&$limit=10&$order=issue_date DESC`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json() as RawPermit[];
        leads = data.map(normalizePermit);
      }
    } else if (county === 'palm-beach') {
      // Palm Beach County open data — building permits (Socrata)
      const url = `https://opendata.pbcgov.com/resource/p6ck-yxuw.json?$where=${KW_FILTER}&$limit=10&$order=issue_date DESC`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json() as RawPermit[];
        leads = data.map(normalizePermit);
      }
    }
  } catch { /* fall through to building-dept fallback */ }

  if (leads.length === 0) {
    const buildingUrl: Record<string, string> = {
      'palm-beach': 'https://www.pbcgov.org/pzb/building',
      'broward': 'https://www.broward.org/Building',
      'miami-dade': 'https://www.miamidade.gov/building',
      'hillsborough': 'https://www.hcflgov.net/government/countyservices/pgsordm/building',
      'pinellas': 'https://www.pinellascounty.org/building',
      'pasco': 'https://www.pascocountyfl.net/index.aspx?NID=117',
      'collier': 'https://www.colliercountyfl.gov/government/growth-management/divisions/building-plan-review-inspection',
    };
    leads = [{
      name: `${area} Building Dept`,
      phone: '', email: '',
      website: buildingUrl[county] ?? 'https://www.broward.org/Building',
      area, type: 'Homeowner', source: 'Permit Records', rating: '',
      notes: `Visit ${county} county building dept to find recent kitchen/remodel permits in ${area}.`,
    }];
  }

  return NextResponse.json({ leads });
}
