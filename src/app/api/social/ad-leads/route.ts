import { NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';

export async function GET() {
  const orgId = await getOrgId();
  const { data } = await serverDb
    .from('ad_leads')
    .select('*, leads(name, phone, email, status)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  return NextResponse.json(data ?? []);
}
