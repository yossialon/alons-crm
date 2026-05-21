import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  const { data, error } = await supabase
    .from('creative_templates')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  const body = await req.json();
  const { data, error } = await supabase
    .from('creative_templates')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  await supabase.from('creative_templates').update({ archived: true }).eq('id', id).eq('org_id', orgId);
  return NextResponse.json({ ok: true });
}
