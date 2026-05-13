import { NextRequest, NextResponse } from 'next/server';
import { LeadUpdateSchema } from '@/lib/schemas/leads';
import { findLeadById, updateLead, deleteLead } from '@/lib/db/repositories/leads';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = LeadUpdateSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const { actorName, ip } = getActorInfo(req);

    const before = await findLeadById(orgId, id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const lead = await updateLead(orgId, id, parsed.data);

    await insertAuditLog({
      org_id: orgId, actor_name: actorName, action: 'update',
      entity_type: 'lead', entity_id: id,
      diff: { before, after: lead },
      ip,
    });

    return NextResponse.json(lead);
  } catch (err) {
    console.error('[PUT /api/leads/[id]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    const { actorName, ip } = getActorInfo(req);

    const before = await findLeadById(orgId, id);
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await deleteLead(orgId, id);

    await insertAuditLog({
      org_id: orgId, actor_name: actorName, action: 'delete',
      entity_type: 'lead', entity_id: id,
      diff: { deleted: before },
      ip,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/leads/[id]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
