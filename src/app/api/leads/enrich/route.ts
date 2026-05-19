import { NextRequest, NextResponse } from 'next/server';
import { enrichLead } from '@/lib/enrichment';

export async function POST(req: NextRequest) {
  const { domain } = await req.json() as { domain: string };
  if (!domain) return NextResponse.json({ email: null });
  const email = await enrichLead(domain);
  return NextResponse.json({ email });
}
