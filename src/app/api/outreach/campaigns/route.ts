import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { zodError } from '@/lib/api-utils';

const Schema = z.object({
  name:          z.string().min(1).max(100),
  template_id:   z.string().uuid().nullable().optional(),
  channel:       z.enum(['email', 'sms', 'whatsapp']),
  target_filter: z.record(z.string(), z.unknown()).default({}),
  scheduled_at:  z.string().datetime({ offset: true }).nullable().optional(),
});

export async function GET() {
  try {
    const orgId = await getOrgId();
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, message_templates(name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(({ message_templates, ...c }) => ({
      ...c,
      template_name: (message_templates as { name: string } | null)?.name ?? null,
    }));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/outreach/campaigns]', err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
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
      .from('campaigns')
      .insert({
        org_id:        orgId,
        name:          d.name,
        channel:       d.channel,
        template_id:   d.template_id ?? null,
        target_filter: d.target_filter,
        scheduled_at:  d.scheduled_at ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/outreach/campaigns]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create campaign' }, { status: 500 });
  }
}
