import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const { searchParams } = new URL(req.url);
  const type     = searchParams.get('type');
  const platform = searchParams.get('platform');
  const campaign = searchParams.get('campaign');
  const favOnly  = searchParams.get('favorites') === 'true';

  let query = supabase
    .from('creative_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (type)     query = query.eq('template_type', type);
  if (platform) query = query.eq('platform', platform);
  if (campaign) query = query.eq('campaign_name', campaign);
  if (favOnly)  query = query.eq('is_favorite', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const body = await req.json();
  const { data, error } = await supabase
    .from('creative_templates')
    .insert({ org_id: orgId, ...body })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
