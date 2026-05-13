import { NextRequest, NextResponse } from 'next/server';
import { ClientCreateSchema } from '@/lib/schemas/clients';
import { listClients, createClient } from '@/lib/db/repositories/clients';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

export async function GET() {
  const clients = await listClients(await getOrgId());
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ClientCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const client = await createClient(orgId, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'create',
    entity_type: 'client', entity_id: client.id as string, ip,
  });

  return NextResponse.json(client, { status: 201 });
}
