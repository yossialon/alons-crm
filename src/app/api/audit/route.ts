import { NextRequest, NextResponse } from 'next/server';
import { listAuditLog, listAuditLogByEntity } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const entityType = searchParams.get('entity_type');
  const entityId   = searchParams.get('entity_id');
  const limit      = Math.min(Number(searchParams.get('limit') ?? 200), 500);

  const orgId = await getOrgId();

  const rows =
    entityType && entityId
      ? await listAuditLogByEntity(orgId, entityType, entityId)
      : await listAuditLog(orgId, limit);

  return NextResponse.json(rows);
}
