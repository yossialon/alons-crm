import { supabase } from '@/lib/supabase';
import type { ProjectCreate, ProjectUpdate } from '@/lib/schemas/projects';

type WithClientName<T> = T & { client_name: string | null };

function flattenClientName<T extends { clients: unknown }>(row: T): Omit<T, 'clients'> & { client_name: string | null } {
  const { clients, ...rest } = row;
  return { ...rest, client_name: (clients as { name: string } | null)?.name ?? null };
}

export async function listProjects(orgId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(flattenClientName);
}

export async function findProjectById(orgId: string, id: string): Promise<WithClientName<Record<string, unknown>> | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return flattenClientName(data) as WithClientName<Record<string, unknown>>;
}

export async function createProject(orgId: string, data: ProjectCreate) {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, org_id: orgId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return project;
}

export async function updateProject(orgId: string, id: string, data: ProjectUpdate) {
  const { data: project, error } = await supabase
    .from('projects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return project;
}

export async function deleteProject(orgId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
