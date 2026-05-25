import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';
import { zodError } from '@/lib/api-utils';

const Schema = z.object({
  lead_id:      z.string().uuid(),
  template_id:  z.string().uuid().nullable().optional(),
  channel:      z.enum(['email', 'sms', 'whatsapp']),
  subject:      z.string().max(200).default(''),
  message:      z.string().min(1).max(5000),
  scheduled_at: z.string().datetime({ offset: true }),
});

export async function GET() {
  try {
    const orgId = await getOrgId();
    const { data, error } = await serverDb
      .from('scheduled_outreach')
      .select('*, leads(name)')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(({ leads, ...row }) => ({
      ...row,
      lead_name: (leads as { name: string } | null)?.name ?? null,
    }));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/outreach/scheduled]', err);
    return NextResponse.json({ error: 'Failed to fetch scheduled outreach' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const { data: row, error } = await serverDb
      .from('scheduled_outreach')
      .insert({ ...parsed.data, org_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/outreach/scheduled]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to schedule outreach' }, { status: 500 });
  }
}
