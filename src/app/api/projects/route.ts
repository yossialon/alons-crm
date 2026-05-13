import { NextRequest, NextResponse } from 'next/server';
import { ProjectCreateSchema } from '@/lib/schemas/projects';
import { listProjects, createProject } from '@/lib/db/repositories/projects';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

export async function GET() {
  const projects = await listProjects(await getOrgId());
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ProjectCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const project = await createProject(orgId, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'create',
    entity_type: 'project', entity_id: project.id as string, ip,
  });

  return NextResponse.json(project, { status: 201 });
}
