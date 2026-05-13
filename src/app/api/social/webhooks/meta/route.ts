import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

type MetaEntry = {
  id: string;
  messaging?: MetaMessage[];
  changes?: { field: string; value: WAValue }[];
};

type MetaMessage = {
  sender:    { id: string };
  recipient: { id: string };
  message?:  { mid: string; text?: string; is_echo?: boolean; attachments?: unknown[] };
  read?:     unknown;
  delivery?: unknown;
};

type WAValue = {
  messages?: { id: string; from: string; type: string; text?: { body: string } }[];
  contacts?: { wa_id: string; profile: { name: string } }[];
  metadata?: { phone_number_id: string };
};

export async function POST(req: NextRequest) {
  let body: { object?: string; entry?: MetaEntry[] };
  try { body = await req.json(); } catch { return new NextResponse('Bad Request', { status: 400 }); }

  const orgId = await getOrgId();

  for (const entry of body.entry ?? []) {
    const pageId = entry.id;

    const { data: conn } = await supabase
      .from('social_connections')
      .select('id, platform')
      .eq('org_id', orgId)
      .or(`page_id.eq.${pageId},account_id.eq.${pageId}`)
      .maybeSingle();
    if (!conn) continue;

    // Facebook / Instagram messages
    for (const msg of entry.messaging ?? []) {
      if (!msg.message || msg.message.is_echo) continue;
      await supabase.from('social_messages').upsert({
        org_id:       orgId,
        connection_id: conn.id,
        platform:     conn.platform,
        external_id:  msg.message.mid,
        thread_id:    msg.sender.id,
        direction:    'inbound',
        sender_id:    msg.sender.id,
        content:      msg.message.text ?? '',
        raw:          msg,
      }, { onConflict: 'org_id,platform,external_id', ignoreDuplicates: true });
    }

    // WhatsApp Cloud API messages
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const val = change.value;

      const nameMap: Record<string, string> = {};
      for (const c of val.contacts ?? []) nameMap[c.wa_id] = c.profile.name;

      for (const waMsg of val.messages ?? []) {
        if (waMsg.type !== 'text') continue;
        await supabase.from('social_messages').upsert({
          org_id:       orgId,
          connection_id: conn.id,
          platform:     'whatsapp',
          external_id:  waMsg.id,
          thread_id:    waMsg.from,
          direction:    'inbound',
          sender_id:    waMsg.from,
          sender_name:  nameMap[waMsg.from] ?? waMsg.from,
          content:      waMsg.text?.body ?? '',
          raw:          waMsg,
        }, { onConflict: 'org_id,platform,external_id', ignoreDuplicates: true });
      }
    }
  }

  return new NextResponse('OK', { status: 200 });
}
