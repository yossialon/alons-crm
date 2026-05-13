import { NextRequest, NextResponse } from 'next/server';
import { ProjectUpdateSchema } from '@/lib/schemas/projects';
import { findProjectById, updateProject, deleteProject } from '@/lib/db/repositories/projects';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const project = await findProjectById(await getOrgId(), id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = ProjectUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findProjectById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await updateProject(orgId, id, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'update',
    entity_type: 'project', entity_id: id,
    diff: { before, after: project },
    ip,
  });

  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const before = await findProjectById(orgId, id);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteProject(orgId, id);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'delete',
    entity_type: 'project', entity_id: id,
    diff: { deleted: before },
    ip,
  });

  return NextResponse.json({ ok: true });
}
