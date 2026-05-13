import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id }  = await params;
    const orgId   = await getOrgId();
    const { error } = await supabase
      .from('scheduled_outreach')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('status', 'pending');
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/outreach/scheduled/[id]]', err);
    return NextResponse.json({ error: 'Failed to cancel scheduled outreach' }, { status: 500 });
  }
}
