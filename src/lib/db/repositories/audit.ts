import { supabase } from '@/lib/supabase';

export interface AuditInsert {
  org_id:      string;
  actor_name:  string;
  action:      'create' | 'update' | 'delete' | 'import' | 'login' | 'logout';
  entity_type: string;
  entity_id?:  string | null;
  diff?:       Record<string, unknown> | null;
  ip:          string;
}

export async function insertAuditLog(row: AuditInsert): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    org_id:      row.org_id,
    actor_name:  row.actor_name,
    action:      row.action,
    entity_type: row.entity_type,
    entity_id:   row.entity_id ?? null,
    diff:        row.diff ?? null,
    ip:          row.ip,
  });
  if (error) throw new Error(`audit_log insert failed: ${error.message}`);
}

export async function listAuditLog(orgId: string, limit = 200) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function listAuditLogByEntity(
  orgId: string,
  entityType: string,
  entityId: string
) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
