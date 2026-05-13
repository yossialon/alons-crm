import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type Ctx = { params: Promise<{ id: string }> };

// Protected by middleware: super_admin only
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body    = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if ('subscription_status' in body) updates.subscription_status = body.subscription_status;
    if ('seats_limit' in body)         updates.seats_limit = Number(body.seats_limit);

    if (Object.keys(updates).length > 1) {
      const { error } = await supabase.from('organizations').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/admin/orgs/[id]]', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/orgs/[id]]', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
