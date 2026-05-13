import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

export async function GET() {
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from('social_connections')
      .select('id, platform, account_name, account_id, page_id, page_name, token_expiry, metadata, created_at, updated_at')
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
