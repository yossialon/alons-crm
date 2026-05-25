import { NextRequest, NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';

export async function GET() {
  const orgId = await getOrgId();
  const { data } = await serverDb
    .from('brand_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  return NextResponse.json(data ?? {
    business_name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Alon's Kitchens",
    tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? 'Custom Cabinets & Vanities · South Florida',
    primary_color: '#92400E',
    secondary_color: '#D97706',
    bg_color: '#FFFFFF',
    text_color: '#1C0A00',
    font_pair: 'modern-luxury',
    brand_voice: 'luxury-sophisticated',
    logo_url: null,
  });
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const body = await req.json() as {
    business_name?: string;
    tagline?: string;
    primary_color?: string;
    secondary_color?: string;
    bg_color?: string;
    text_color?: string;
    font_pair?: string;
    brand_voice?: string;
    logo_url?: string;
  };

  const { data, error } = await serverDb
    .from('brand_settings')
    .upsert({ org_id: orgId, ...body, updated_at: new Date().toISOString() }, { onConflict: 'org_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
