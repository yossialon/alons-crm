import { NextRequest, NextResponse } from 'next/server';
import { SupplierUpdateSchema } from '@/lib/schemas/suppliers';
import { findSupplierById, updateSupplier, deleteSupplier } from '@/lib/db/repositories/suppliers';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = SupplierUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findSupplierById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const supplier = await updateSupplier(orgId, id, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'update',
    entity_type: 'supplier', entity_id: id,
    diff: { before, after: supplier },
    ip,
  });

  return NextResponse.json(supplier);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findSupplierById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteSupplier(orgId, id);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'delete',
    entity_type: 'supplier', entity_id: id,
    diff: { deleted: before },
    ip,
  });

  return NextResponse.json({ ok: true });
}
