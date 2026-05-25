import { NextRequest, NextResponse } from 'next/server';
import { searchPermitsByCounty, COUNTY_MAP } from '@/lib/permits';

export async function POST(req: NextRequest) {
  const { area } = await req.json() as { area: string };
  const county = COUNTY_MAP[area] ?? 'broward';
  const leads = await searchPermitsByCounty(county, area);
  return NextResponse.json({ leads });
}
