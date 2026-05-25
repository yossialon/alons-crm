import { NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';

export async function GET() {
  try {
    const orgId = await getOrgId();
    const { data, error } = await serverDb
      .from('social_connections')
      .select('id, org_id, platform, access_token, page_id, account_id, expires_at, created_at, updated_at')
      .eq('org_id', orgId)
      .order('platform')
      .order('created_at');
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/social/connections]', err);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}
