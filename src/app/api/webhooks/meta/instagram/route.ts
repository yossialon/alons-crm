import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { verifyMetaSignature, sendInstagramDM, generateSocialReply } from '@/lib/meta';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'alons_verify_token';

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
            verb?: string;
            comment_id?: string;
            post_id?: string;
            from?: { id: string; name?: string };
            message?: string;
            // DM reply webhook fields
            sender?: { id: string };
            recipient?: { id: string };
            text?: string;
            mid?: string;
          };
        }[];
      }[];
    };

    if (body.object !== 'instagram') return NextResponse.json({ ok: true });

    const orgId = await getOrgId();
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('org_id', orgId)
      .eq('key', 'instagram_auto_reply')
      .single();

    const autoReplyEnabled = (setting?.value ?? process.env.INSTAGRAM_AUTO_REPLY ?? 'true') !== 'false';

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        // Handle DM replies — auto-create as lead if not already one
        if (change.field === 'messages') {
          const { sender, text, mid } = change.value;
          if (!sender || !text || !mid) continue;
          const senderId = sender.id;

          // Check if this sender is already a lead via instagram_interactions
          const { data: interaction } = await supabase
            .from('instagram_interactions')
            .select('lead_id, commenter_username')
            .eq('commenter_id', senderId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (interaction && !interaction.lead_id) {
            // Create lead from DM reply
            const { data: newLead } = await supabase
              .from('leads')
              .insert({
                org_id: orgId,
                name: interaction.commenter_username || 'Instagram User',
                phone: '',
                source: 'Instagram Comment',
                status: 'new',
                type: 'Homeowner',
                area: 'South Florida',
                potential: 'medium',
              })
              .select()
              .single();

            if (newLead) {
              await supabase
                .from('instagram_interactions')
                .update({ lead_id: newLead.id })
                .eq('commenter_id', senderId);
            }
          }
          continue;
        }

        // Handle new comments — auto-DM
        if (change.field !== 'comments' && change.field !== 'mention') continue;
        if (!autoReplyEnabled) continue;

        const { from, message, post_id, comment_id } = change.value;
        if (!from || !message) continue;

        const commenterId = from.id;
        const commenterName = from.name ?? 'Instagram User';
        const commentText = message;

        const dmText = await generateSocialReply({
          channel: 'instagram',
          senderName: commenterName,
          messageText: commentText,
          isExistingLead: false,
          isAfterHours: false,
        });

        const dmMsgId = await sendInstagramDM(commenterId, dmText);

        await supabase.from('instagram_interactions').insert({
          org_id: orgId,
          commenter_username: commenterName,
          commenter_id: commenterId,
          comment_text: commentText,
          post_id: post_id ?? comment_id ?? '',
          dm_sent: !!dmMsgId,
          dm_text: dmText,
          dm_message_id: dmMsgId,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Instagram webhook error:', err);
    return NextResponse.json({ ok: true }); // Always 200 to Meta
  }
}
