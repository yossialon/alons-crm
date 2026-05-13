import { NextRequest, NextResponse } from 'next/server';
import { ClientUpdateSchema } from '@/lib/schemas/clients';
import { findClientById, updateClient, deleteClient } from '@/lib/db/repositories/clients';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const client = await findClientById(await getOrgId(), id);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = ClientUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findClientById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const client = await updateClient(orgId, id, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'update',
    entity_type: 'client', entity_id: id,
    diff: { before, after: client },
    ip,
  });

  return NextResponse.json(client);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findClientById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteClient(orgId, id);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'delete',
    entity_type: 'client', entity_id: id,
    diff: { deleted: before },
    ip,
  });

  return NextResponse.json({ ok: true });
}
