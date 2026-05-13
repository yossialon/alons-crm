import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { sendEmail, buildTrackedHtml } from '@/lib/outreach/email';
import { sendSms } from '@/lib/outreach/sms';
import { interpolate, leadToVars } from '@/lib/outreach/template';

type Ctx = { params: Promise<{ id: string }> };

type Lead = {
  id: string; name: string; email: string; phone: string;
  area: string; type: string; source: string; status: string; potential: string;
};

function matchesFilter(lead: Lead, filter: Record<string, unknown>): boolean {
  if (filter.status    && lead.status    !== filter.status)    return false;
  if (filter.potential && lead.potential !== filter.potential) return false;
  if (filter.type      && lead.type      !== filter.type)      return false;
  return true;
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const orgId  = await getOrgId();

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, channel, template_id, status, target_filter, sent_count')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (!campaign)                     return NextResponse.json({ error: 'Not found' },            { status: 404 });
    if (campaign.status === 'sending') return NextResponse.json({ error: 'Already sending' },      { status: 409 });
    if (campaign.status === 'sent')    return NextResponse.json({ error: 'Campaign already sent' }, { status: 409 });
    if (!campaign.template_id)         return NextResponse.json({ error: 'No template assigned' }, { status: 422 });

    const { data: template } = await supabase
      .from('message_templates')
      .select('subject, body')
      .eq('id', campaign.template_id as string)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    await supabase.from('campaigns').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', id);

    const filter = (campaign.target_filter ?? {}) as Record<string, unknown>;

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('org_id', orgId)
      .neq('status', 'closed');

    const targets = (leads ?? []).filter((l) => matchesFilter(l as Lead, filter)) as Lead[];

    let sent = 0;
    let failed = 0;

    for (const lead of targets) {
      const { data: existing } = await supabase
        .from('campaign_sends')
        .select('id')
        .eq('campaign_id', id)
        .eq('lead_id', lead.id)
        .maybeSingle();
      if (existing) continue;

      const vars    = leadToVars(lead);
      const body    = interpolate((template as { body: string }).body, vars);
      const subject = interpolate((template as { subject: string }).subject || (campaign as { name: string }).name, vars);

      const { data: sendRow } = await supabase
        .from('campaign_sends')
        .insert({ org_id: orgId, campaign_id: id, lead_id: lead.id })
        .select('id')
        .single();

      let result: { ok: boolean; error?: string };

      if (campaign.channel === 'email') {
        const html = buildTrackedHtml({ body, sendId: sendRow!.id as string, appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '' });
        result = await sendEmail({ to: lead.email, subject, html });
      } else if (campaign.channel === 'sms') {
        result = await sendSms({ to: lead.phone, body });
      } else if (campaign.channel === 'whatsapp') {
        const { data: conn } = await supabase
          .from('social_connections')
          .select('access_token, page_id')
          .eq('org_id', orgId)
          .eq('platform', 'whatsapp')
          .maybeSingle();
        if (conn && lead.phone) {
          const res = await fetch(`https://graph.facebook.com/v21.0/${(conn as { page_id: string }).page_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(conn as { access_token: string }).access_token}` },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: lead.phone.replace(/\D/g, ''), type: 'text', text: { body } }),
          });
          result = { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
        } else {
          result = { ok: false, error: 'No WhatsApp connection or missing phone' };
        }
      } else {
        result = { ok: false, error: 'Unknown channel' };
      }

      await supabase.from('campaign_sends').update({
        status:  result.ok ? 'sent' : 'failed',
        sent_at: result.ok ? new Date().toISOString() : null,
        error:   result.error ?? null,
      }).eq('id', sendRow!.id as string);

      result.ok ? sent++ : failed++;
    }

    await supabase.from('campaigns').update({
      status:     'sent',
      sent_count: ((campaign.sent_count as number) ?? 0) + sent,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({ ok: true, sent, failed, total: targets.length });
  } catch (err) {
    console.error('[POST /api/outreach/campaigns/[id]/send]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}
