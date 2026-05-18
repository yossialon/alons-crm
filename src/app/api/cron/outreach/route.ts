import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { sendEmail, buildTrackedHtml } from '@/lib/outreach/email';
import { sendSms } from '@/lib/outreach/sms';
import { interpolate, leadToVars } from '@/lib/outreach/template';

// Manual-only endpoint — no cron schedule. getOrgId() enforces session auth.
// If CRON_SECRET is set, external callers must supply it as a Bearer token.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

type Lead = { id: string; name: string; email: string; phone: string; area: string; type: string; source: string; status: string; potential: string; created_at: string };

async function dispatchMessage(
  channel: string,
  lead: Lead,
  subject: string,
  body: string,
  sendId: string,
  orgId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (channel === 'email') {
    const html = buildTrackedHtml({ body, sendId, appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '' });
    return sendEmail({ to: lead.email, subject, html });
  }
  if (channel === 'sms') {
    return sendSms({ to: lead.phone, body });
  }
  if (channel === 'whatsapp') {
    const { data: conn } = await supabase
      .from('social_connections')
      .select('access_token, page_id')
      .eq('org_id', orgId)
      .eq('platform', 'whatsapp')
      .maybeSingle();
    if (!conn || !lead.phone) return { ok: false, error: 'No WhatsApp connection or missing phone' };
    const res = await fetch(`https://graph.facebook.com/v21.0/${(conn as { page_id: string }).page_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(conn as { access_token: string }).access_token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: lead.phone.replace(/\D/g, ''), type: 'text', text: { body } }),
    });
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
  }
  return { ok: false, error: 'Unknown channel' };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getOrgId();
  let processed = 0;

  // ── 1. Process due scheduled_outreach rows ────────────────────────────────
  const { data: due } = await supabase
    .from('scheduled_outreach')
    .select('id, lead_id, channel, subject, message')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50);

  for (const row of due ?? []) {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', row.lead_id)
      .maybeSingle();

    if (!lead) {
      await supabase
        .from('scheduled_outreach')
        .update({ status: 'failed', error: 'Lead not found' })
        .eq('id', row.id);
      continue;
    }

    const result = await dispatchMessage(row.channel, lead as Lead, row.subject, row.message, row.id, orgId);

    await supabase
      .from('scheduled_outreach')
      .update({
        status:  result.ok ? 'sent' : 'failed',
        sent_at: result.ok ? new Date().toISOString() : null,
        error:   result.error ?? null,
      })
      .eq('id', row.id);
    processed++;
  }

  // ── 2. Evaluate automation rules ──────────────────────────────────────────
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*, message_templates(body, subject)')
    .eq('org_id', orgId)
    .eq('enabled', true);

  const { data: allLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .neq('status', 'closed');

  for (const rule of rules ?? []) {
    const tmplBody    = (rule.message_templates as { body?: string; subject?: string } | null)?.body;
    const tmplSubject = (rule.message_templates as { body?: string; subject?: string } | null)?.subject ?? '';
    if (!tmplBody) continue;

    for (const lead of (allLeads ?? []) as Lead[]) {
      const f: Record<string, string> = (rule.lead_filter as Record<string, string>) ?? {};
      if (f.status    && lead.status    !== f.status)    continue;
      if (f.potential && lead.potential !== f.potential) continue;
      if (f.type      && lead.type      !== f.type)      continue;

      let triggered = false;
      if (rule.trigger_type === 'days_since_created') {
        const days = (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000;
        triggered = Math.floor(days) === parseInt(rule.trigger_value as string, 10);
      } else if (rule.trigger_type === 'status_is') {
        triggered = lead.status === rule.trigger_value;
      } else if (rule.trigger_type === 'days_since_contact') {
        const { data: last } = await supabase
          .from('outreach_log')
          .select('contacted_at')
          .eq('lead_id', lead.id)
          .order('contacted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last) {
          const days = (Date.now() - new Date((last as { contacted_at: string }).contacted_at).getTime()) / 86_400_000;
          triggered = Math.floor(days) === parseInt(rule.trigger_value as string, 10);
        }
      }
      if (!triggered) continue;

      // Avoid duplicate automation sends: check scheduled_outreach for same rule+lead today
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

      const { data: already } = await supabase
        .from('scheduled_outreach')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('template_id', rule.template_id ?? null)
        .gte('scheduled_at', todayStart.toISOString())
        .lt('scheduled_at', todayEnd.toISOString())
        .in('status', ['pending', 'sent'])
        .maybeSingle();
      if (already) continue;

      const vars    = leadToVars(lead);
      const body    = interpolate(tmplBody, vars);
      const subject = interpolate(tmplSubject, vars);

      await supabase.from('scheduled_outreach').insert({
        org_id:       orgId,
        lead_id:      lead.id,
        template_id:  rule.template_id ?? null,
        channel:      rule.channel,
        subject,
        message:      body,
        scheduled_at: new Date().toISOString(),
      });
      processed++;
    }
  }

  return NextResponse.json({ ok: true, processed });
}

// Allow GET for manual testing in browser
export const GET = POST;
