import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const orgId  = await getOrgId();

    const body = await req.json().catch(() => null);
    const text = (body?.text ?? '').trim();
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    // Load the original message + connection token
    const { data: msg } = await supabase
      .from('social_messages')
      .select('org_id, connection_id, platform, thread_id, social_connections!inner(access_token, page_id)')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const conn = msg.social_connections as unknown as { access_token: string; page_id: string | null } | null;
    let platformSent = false;

    try {
      if (msg.platform === 'facebook' || msg.platform === 'instagram') {
        const res = await fetch('https://graph.facebook.com/v21.0/me/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient:    { id: msg.thread_id },
            message:      { text },
            access_token: conn?.access_token,
          }),
        });
        platformSent = res.ok;
      } else if (msg.platform === 'whatsapp') {
        const res = await fetch(`https://graph.facebook.com/v21.0/${conn?.page_id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conn?.access_token}` },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to:   msg.thread_id,
            type: 'text',
            text: { body: text },
          }),
        });
        platformSent = res.ok;
      }
    } catch { /* non-critical */ }

    const now = new Date().toISOString();
    await Promise.all([
      supabase.from('social_messages').insert({
        org_id:       msg.org_id,
        connection_id: msg.connection_id,
        platform:     msg.platform,
        external_id:  randomUUID(),
        thread_id:    msg.thread_id,
        direction:    'outbound',
        sender_name:  "Alon's Kitchens",
        content:      text,
        replied_at:   now,
        raw:          {},
      }),
      supabase.from('social_messages').update({ replied_at: now }).eq('id', id),
    ]);

    return NextResponse.json({ ok: true, platform_sent: platformSent });
  } catch (err) {
    console.error('[POST /api/social/messages/[id]/reply]', err);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
