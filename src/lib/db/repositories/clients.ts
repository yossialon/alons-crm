import { supabase } from '@/lib/supabase';
import type { ClientCreate, ClientUpdate } from '@/lib/schemas/clients';

export async function listClients(orgId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function findClientById(orgId: string, id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createClient(orgId: string, data: ClientCreate) {
  const { data: client, error } = await supabase
    .from('clients')
    .insert({ ...data, org_id: orgId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return client;
}

export async function updateClient(orgId: string, id: string, data: ClientUpdate) {
  const { data: client, error } = await supabase
    .from('clients')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return client;
}

export async function deleteClient(orgId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
