import { supabase } from '@/lib/supabase';
import type { SupplierCreate, SupplierUpdate } from '@/lib/schemas/suppliers';

export async function listSuppliers(orgId: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function findSupplierById(orgId: string, id: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSupplier(orgId: string, data: SupplierCreate) {
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({ ...data, org_id: orgId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return supplier;
}

export async function updateSupplier(orgId: string, id: string, data: SupplierUpdate) {
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return supplier;
}

export async function deleteSupplier(orgId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
