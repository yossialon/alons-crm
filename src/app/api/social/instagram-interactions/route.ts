import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

export async function GET() {
  const orgId = await getOrgId();
  const { data } = await supabase
    .from('instagram_interactions')
    .select('id, created_at, dm_sent, dm_text, commenter_username, comment_text, post_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);
  return NextResponse.json(data ?? []);
}
