import { NextRequest, NextResponse } from 'next/server';
import { TaskCreateSchema } from '@/lib/schemas/tasks';
import { listTasks, createTask } from '@/lib/db/repositories/tasks';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filters = {
    lead_id:    searchParams.get('lead_id')    ?? undefined,
    project_id: searchParams.get('project_id') ?? undefined,
  };
  const tasks = await listTasks(await getOrgId(), filters);
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = TaskCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const task = await createTask(orgId, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'create',
    entity_type: 'task', entity_id: task.id as string, ip,
  });

  return NextResponse.json(task, { status: 201 });
}
