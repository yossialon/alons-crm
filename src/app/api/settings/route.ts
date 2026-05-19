import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

export async function GET() {
  const orgId = await getOrgId();
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('org_id', orgId);
  const settings: Record<string, string> = {};
  (data ?? []).forEach(r => { settings[r.key] = r.value; });
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const { key, value } = await req.json() as { key: string; value: string };
  await supabase.from('app_settings').upsert(
    { org_id: orgId, key, value, updated_at: new Date().toISOString() },
    { onConflict: 'org_id,key' }
  );
  return NextResponse.json({ ok: true });
}
