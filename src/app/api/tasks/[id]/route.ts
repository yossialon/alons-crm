import { NextRequest, NextResponse } from 'next/server';
import { TaskUpdateSchema } from '@/lib/schemas/tasks';
import { findTaskById, updateTask, deleteTask } from '@/lib/db/repositories/tasks';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const task = await findTaskById(await getOrgId(), id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = TaskUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findTaskById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const task = await updateTask(orgId, id, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'update',
    entity_type: 'task', entity_id: id,
    diff: { before, after: task },
    ip,
  });

  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findTaskById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteTask(orgId, id);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'delete',
    entity_type: 'task', entity_id: id,
    diff: { deleted: before },
    ip,
  });

  return NextResponse.json({ ok: true });
}
