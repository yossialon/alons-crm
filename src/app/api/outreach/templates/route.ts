import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';
import { zodError } from '@/lib/api-utils';

const Schema = z.object({
  name:    z.string().min(1).max(100),
  channel: z.enum(['email', 'sms', 'whatsapp']),
  subject: z.string().max(200).default(''),
  body:    z.string().min(1).max(10000),
});

export async function GET() {
  try {
    const orgId = await getOrgId();
    const { data, error } = await serverDb
      .from('message_templates')
      .select('*')
      .eq('org_id', orgId)
      .order('channel')
      .order('name');
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/outreach/templates]', err);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const { data: row, error } = await serverDb
      .from('message_templates')
      .insert({ ...parsed.data, org_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[POST /api/outreach/templates]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create template' }, { status: 500 });
  }
}
