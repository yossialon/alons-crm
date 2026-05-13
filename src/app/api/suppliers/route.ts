import { NextRequest, NextResponse } from 'next/server';
import { SupplierCreateSchema } from '@/lib/schemas/suppliers';
import { listSuppliers, createSupplier } from '@/lib/db/repositories/suppliers';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

export async function GET() {
  const suppliers = await listSuppliers(await getOrgId());
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SupplierCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const supplier = await createSupplier(orgId, parsed.data);

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'create',
    entity_type: 'supplier', entity_id: supplier.id as string, ip,
  });

  return NextResponse.json(supplier, { status: 201 });
}
