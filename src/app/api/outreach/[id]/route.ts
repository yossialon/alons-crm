import { NextRequest, NextResponse } from 'next/server';
import { deleteOutreach } from '@/lib/db/repositories/outreach';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { getActorInfo } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const orgId  = await getOrgId();
    const { actorName, ip } = getActorInfo(req);

    const deleted = await deleteOutreach(orgId, id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await insertAuditLog({
      org_id: orgId, actor_name: actorName, action: 'delete',
      entity_type: 'outreach', entity_id: id, ip,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/outreach/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete outreach' }, { status: 500 });
  }
}
