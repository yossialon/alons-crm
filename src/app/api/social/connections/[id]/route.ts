import { NextRequest, NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id }  = await params;
    const orgId   = await getOrgId();

    const { data: existing } = await serverDb
      .from('social_connections')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { error } = await serverDb
      .from('social_connections')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/social/connections/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}
