import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { zodError } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({
  name:          z.string().min(1).max(100).optional(),
  enabled:       z.boolean().optional(),
  trigger_type:  z.enum(['days_since_created', 'days_since_contact', 'status_is']).optional(),
  trigger_value: z.string().optional(),
  lead_filter:   z.record(z.string(), z.unknown()).optional(),
  template_id:   z.string().uuid().nullable().optional(),
  channel:       z.enum(['email', 'sms', 'whatsapp']).optional(),
});

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body   = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId   = await getOrgId();
    const d       = parsed.data;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (d.name          !== undefined) updates.name          = d.name;
    if (d.enabled       !== undefined) updates.enabled       = d.enabled;
    if (d.trigger_type  !== undefined) updates.trigger_type  = d.trigger_type;
    if (d.trigger_value !== undefined) updates.trigger_value = d.trigger_value;
    if (d.lead_filter   !== undefined) updates.lead_filter   = d.lead_filter;
    if ('template_id'    in d)         updates.template_id   = d.template_id ?? null;
    if (d.channel       !== undefined) updates.channel       = d.channel;

    const { data: row, error } = await supabase
      .from('automation_rules')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[PUT /api/outreach/automations/[id]]', err);
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id }  = await params;
    const orgId   = await getOrgId();
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/outreach/automations/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 });
  }
}
