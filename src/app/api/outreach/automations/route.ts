import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { zodError } from '@/lib/api-utils';

const Schema = z.object({
  name:          z.string().min(1).max(100),
  enabled:       z.boolean().default(true),
  trigger_type:  z.enum(['days_since_created', 'days_since_contact', 'status_is']),
  trigger_value: z.string().min(1).max(100),
  lead_filter:   z.record(z.string(), z.unknown()).default({}),
  template_id:   z.string().uuid().nullable().optional(),
  channel:       z.enum(['email', 'sms', 'whatsapp']),
});

export async function GET() {
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*, message_templates(name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(({ message_templates, ...rule }) => ({
      ...rule,
      template_name: (message_templates as { name: string } | null)?.name ?? null,
    }));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/outreach/automations]', err);
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const d     = parsed.data;
    const { data: row, error } = await supabase
      .from('automation_rules')
      .insert({
        org_id:        orgId,
        name:          d.name,
        enabled:       d.enabled,
        trigger_type:  d.trigger_type,
        trigger_value: d.trigger_value,
        lead_filter:   d.lead_filter,
        template_id:   d.template_id ?? null,
        channel:       d.channel,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/outreach/automations]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create automation' }, { status: 500 });
  }
}
