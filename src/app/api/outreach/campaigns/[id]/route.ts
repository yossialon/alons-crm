import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { zodError } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({
  name:          z.string().min(1).max(100).optional(),
  template_id:   z.string().uuid().nullable().optional(),
  status:        z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused']).optional(),
  target_filter: z.record(z.string(), z.unknown()).optional(),
  scheduled_at:  z.string().datetime({ offset: true }).nullable().optional(),
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
    if ('template_id'    in d)         updates.template_id   = d.template_id ?? null;
    if (d.status        !== undefined) updates.status        = d.status;
    if (d.target_filter !== undefined) updates.target_filter = d.target_filter;
    if ('scheduled_at'   in d)         updates.scheduled_at  = d.scheduled_at ?? null;

    const { data: row, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[PUT /api/outreach/campaigns/[id]]', err);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id }  = await params;
    const orgId   = await getOrgId();
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { error } = await supabase.from('campaigns').delete().eq('id', id).eq('org_id', orgId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/outreach/campaigns/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
