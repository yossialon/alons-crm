import { NextRequest, NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const orgId = await getOrgId();
    const { searchParams } = new URL(req.url);
    const platform   = searchParams.get('platform') ?? 'all';
    const unreadOnly = searchParams.get('unread') === 'true';
    const threadId   = searchParams.get('thread_id');

    let query = serverDb
      .from('social_messages')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);

    // When fetching a single thread, return all directions; otherwise list only inbound
    if (!threadId) query = query.eq('direction', 'inbound');
    if (platform !== 'all') query = query.eq('platform', platform);
    if (unreadOnly) query = query.eq('is_read', false);
    if (threadId)   query = query.eq('thread_id', threadId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Normalise: the original schema uses `content`; webhook inserts may use `message`.
    // Return a `message` field that callers can rely on regardless of which column exists.
    const rows = (data ?? []).map(row => ({
      ...row,
      message: (row as Record<string, unknown>).message
        ?? (row as Record<string, unknown>).content
        ?? '',
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

    if (thread_id) {
      await serverDb
        .from('social_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('thread_id', thread_id)
        .eq('is_read', false);
    } else if (id) {
      await serverDb
        .from('social_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/social/messages]', err);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
