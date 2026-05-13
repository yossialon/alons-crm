import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const orgId = await getOrgId();
    const { searchParams } = new URL(req.url);
    const platform   = searchParams.get('platform') ?? 'all';
    const unreadOnly = searchParams.get('unread') === 'true';
    const threadId   = searchParams.get('thread_id');

    let query = supabase
      .from('social_messages')
      .select('*, social_connections!inner(account_name, page_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!threadId)        query = query.eq('direction', 'inbound');
    if (platform !== 'all') query = query.eq('platform', platform);
    if (unreadOnly)       query = query.is('read_at', null);
    if (threadId)         query = query.eq('thread_id', threadId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(({ social_connections, ...msg }) => ({
      ...msg,
      account_name: (social_connections as { account_name: string; page_name: string } | null)?.account_name ?? null,
      page_name:    (social_connections as { account_name: string; page_name: string } | null)?.page_name    ?? null,
    }));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/social/messages]', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const orgId = await getOrgId();
    const { id, thread_id } = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    if (thread_id) {
      await supabase
        .from('social_messages')
        .update({ read_at: now })
        .eq('org_id', orgId)
        .eq('thread_id', thread_id)
        .is('read_at', null);
    } else if (id) {
      await supabase
        .from('social_messages')
        .update({ read_at: now })
        .eq('id', id)
        .eq('org_id', orgId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/social/messages]', err);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
