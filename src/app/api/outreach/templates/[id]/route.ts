import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';
import { zodError } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({
  name:    z.string().min(1).max(100).optional(),
  channel: z.enum(['email', 'sms', 'whatsapp']).optional(),
  subject: z.string().max(200).optional(),
  body:    z.string().min(1).max(10000).optional(),
});

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body   = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const { data: row, error } = await serverDb
      .from('message_templates')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[PUT /api/outreach/templates/[id]]', err);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id }  = await params;
    const orgId   = await getOrgId();
    const { data: existing } = await serverDb
      .from('message_templates')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { error } = await serverDb.from('message_templates').delete().eq('id', id).eq('org_id', orgId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/outreach/templates/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
