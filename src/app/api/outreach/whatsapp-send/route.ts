import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { sendWhatsAppMessage } from '@/lib/meta';

export async function POST(req: NextRequest) {
  const { to, message } = await req.json() as { to: string; message: string };
  const msgId = await sendWhatsAppMessage(to, message);
  if (!msgId) return NextResponse.json({ error: 'WhatsApp not configured or send failed' }, { status: 500 });
  const orgId = await getOrgId();
  await supabase.from('social_messages').insert({
    org_id: orgId,
    platform: 'whatsapp',
    thread_id: to,
    sender_name: "Alon's Kitchens",
    sender_phone: to,
    message,
    direction: 'outbound',
    is_read: true,
    is_hot: false,
    meta_message_id: msgId,
  });
  return NextResponse.json({ ok: true, msgId });
}
