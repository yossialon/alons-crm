import { NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';

export async function POST() {
  try {
    const orgId = await getOrgId();
    const { data: connections } = await serverDb
      .from('social_connections')
      .select('id, platform, account_id, access_token, page_id')
      .eq('org_id', orgId);

    let synced = 0;

    for (const conn of connections ?? []) {
      try {
        if (conn.platform === 'linkedin') {
          synced += await syncLinkedIn(conn as { id: string; access_token: string; account_id: string }, orgId);
        } else if (conn.platform === 'tiktok') {
          synced += await syncTikTok(conn as { id: string; access_token: string; account_id: string }, orgId);
        }
      } catch { /* continue on per-platform error */ }
    }

    return NextResponse.json({ ok: true, synced });
  } catch (err) {
    console.error('[POST /api/social/sync]', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

async function syncLinkedIn(
  conn: { id: string; access_token: string; account_id: string },
  orgId: string
): Promise<number> {
  const res = await fetch(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:organization:${conn.account_id})&sortBy=LAST_MODIFIED&count=10`,
    { headers: { Authorization: `Bearer ${conn.access_token}`, 'LinkedIn-Version': '202401' } }
  );
  if (!res.ok) return 0;

  const data  = await res.json();
  const posts = (data.elements ?? []) as { id: string }[];
  let count   = 0;

  for (const post of posts.slice(0, 5)) {
    const commentsRes = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(post.id)}/comments?count=20`,
      { headers: { Authorization: `Bearer ${conn.access_token}`, 'LinkedIn-Version': '202401' } }
    );
    if (!commentsRes.ok) continue;
    const comments = await commentsRes.json();

    for (const c of (comments.elements ?? []) as { id: string; actor: string; message: { text: string }; created: { time: number } }[]) {
      const authorParts = (c.actor ?? '').split(':');
      const authorId    = authorParts[authorParts.length - 1] ?? c.actor;

      const { data: inserted } = await serverDb.from('social_messages').upsert({
        org_id:       orgId,
        connection_id: conn.id,
        platform:     'linkedin',
        external_id:  c.id,
        thread_id:    post.id,
        direction:    'inbound',
        sender_id:    authorId,
        content:      c.message?.text ?? '',
        raw:          c,
        created_at:   c.created?.time ? new Date(c.created.time).toISOString() : new Date().toISOString(),
      }, { onConflict: 'org_id,platform,external_id', ignoreDuplicates: true }).select('id');

      count += (inserted?.length ?? 0);
    }
  }
  return count;
}

async function syncTikTok(
  conn: { id: string; access_token: string; account_id: string },
  orgId: string
): Promise<number> {
  const videosRes = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time', {
    method: 'POST',
    headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_count: 10 }),
  });
  if (!videosRes.ok) return 0;

  const videosData = await videosRes.json();
  const videos     = (videosData.data?.videos ?? []) as { id: string }[];
  let count        = 0;

  for (const video of videos.slice(0, 5)) {
    const commentsRes = await fetch(
      `https://open.tiktokapis.com/v2/comment/list/?fields=id,text,create_time,user.display_name&video_id=${video.id}&max_count=20`,
      { headers: { Authorization: `Bearer ${conn.access_token}` } }
    );
    if (!commentsRes.ok) continue;
    const commentsData = await commentsRes.json();

    for (const c of (commentsData.data?.comments ?? []) as { id: string; text: string; create_time: number; user?: { display_name: string } }[]) {
      const { data: inserted } = await serverDb.from('social_messages').upsert({
        org_id:       orgId,
        connection_id: conn.id,
        platform:     'tiktok',
        external_id:  c.id,
        thread_id:    video.id,
        direction:    'inbound',
        sender_id:    c.id,
        sender_name:  c.user?.display_name ?? 'TikTok User',
        content:      c.text,
        raw:          c,
        created_at:   c.create_time ? new Date(c.create_time * 1000).toISOString() : new Date().toISOString(),
      }, { onConflict: 'org_id,platform,external_id', ignoreDuplicates: true }).select('id');

      count += (inserted?.length ?? 0);
    }
  }
  return count;
}
