import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { verifyMetaSignature, sendWhatsAppMessage, generateSocialReply } from '@/lib/meta';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'alons_verify_token';
const HOT_KEYWORDS = ['price', 'cost', 'estimate', 'quote', 'how much', 'pricing', 'rate', 'charge'];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('hub.mode') === 'subscribe' && searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as {
      object?: string;
      entry?: {
        changes?: {
          field: string;
          value: {
            messages?: {
              id: string;
              from: string;
              type: string;
              text?: { body: string };
              timestamp: string;
            }[];
            contacts?: { profile?: { name?: string }; wa_id?: string }[];
          };
        }[];
      }[];
    };

    if (body.object !== 'whatsapp_business_account') return NextResponse.json({ ok: true });

    const orgId = await getOrgId();

    // Check auto-reply setting
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('org_id', orgId)
      .eq('key', 'whatsapp_auto_reply')
      .single();
    const autoReplyEnabled = (setting?.value ?? process.env.WHATSAPP_AUTO_REPLY ?? 'true') !== 'false';

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const { messages, contacts } = change.value;
        if (!messages?.length) continue;

        for (const msg of messages) {
          if (msg.type !== 'text') continue;
          const text = msg.text?.body ?? '';
          const phone = msg.from;
          const senderName = contacts?.[0]?.profile?.name ?? 'WhatsApp User';
          const isHot = HOT_KEYWORDS.some(k => text.toLowerCase().includes(k));

          // Check if existing lead
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id, name')
            .eq('phone', phone)
            .maybeSingle();

          let leadId = existingLead?.id ?? null;

          // Create lead if new
          if (!existingLead) {
            const { data: newLead } = await supabase
              .from('leads')
              .insert({
                org_id: orgId,
                name: senderName,
                phone,
                source: 'WhatsApp Inbound',
                status: 'new',
                type: 'Homeowner',
                area: 'South Florida',
                potential: isHot ? 'high' : 'medium',
              })
              .select()
              .single();
            leadId = newLead?.id ?? null;
          }

          // Save inbound message
          await supabase.from('social_messages').insert({
            org_id: orgId,
            platform: 'whatsapp',
            thread_id: phone,
            sender_name: senderName,
            sender_phone: phone,
            message: text,
            direction: 'inbound',
            is_hot: isHot,
            is_read: false,
            lead_id: leadId,
            meta_message_id: msg.id,
          });

          // Auto-reply
          if (autoReplyEnabled) {
            const hour = new Date().getHours();
            const replyText = await generateSocialReply({
              channel: 'whatsapp',
              senderName,
              messageText: text,
              isExistingLead: !!existingLead,
              isAfterHours: hour < 8 || hour >= 18,
            });

            const msgId = await sendWhatsAppMessage(phone, replyText);

            // Save outbound message
            if (msgId) {
              await supabase.from('social_messages').insert({
                org_id: orgId,
                platform: 'whatsapp',
                thread_id: phone,
                sender_name: "Alon's Kitchens",
                sender_phone: phone,
                message: replyText,
                direction: 'outbound',
                is_read: true,
                is_hot: false,
                lead_id: leadId,
                meta_message_id: msgId,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return NextResponse.json({ ok: true }); // Always 200 to Meta
  }
}
