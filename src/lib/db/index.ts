/**
 * Org-scoped database helpers
 *
 * Thin wrappers around the service-role Supabase client that automatically
 * inject org_id into every query. Use these in any API route or server action
 * to guarantee tenant isolation without repeating `.eq('org_id', orgId)` everywhere.
 *
 * Usage:
 *   import { orgDb } from '@/lib/db';
 *   const db = orgDb(orgId);
 *   const leads = await db.list('leads');
 *   const lead  = await db.get('leads', leadId);
 *   await db.insert('leads', { name: 'Jane', phone: '...' });
 *   await db.update('leads', leadId, { status: 'contacted' });
 *   await db.remove('leads', leadId);
 */

import { serverDb } from '@/lib/supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Row = Record<string, unknown>;

export interface OrgDb {
  /** SELECT * FROM table WHERE org_id = ? ORDER BY created_at DESC */
  list<T extends Row>(table: string, opts?: ListOpts): Promise<T[]>;

  /** SELECT * FROM table WHERE org_id = ? AND id = ? */
  get<T extends Row>(table: string, id: string): Promise<T | null>;

  /** INSERT INTO table (org_id, ...data) RETURNING * */
  insert<T extends Row>(table: string, data: Row): Promise<T>;

  /** UPDATE table SET ...data WHERE org_id = ? AND id = ? RETURNING * */
  update<T extends Row>(table: string, id: string, data: Row): Promise<T | null>;

  /** DELETE FROM table WHERE org_id = ? AND id = ? */
  remove(table: string, id: string): Promise<void>;

  /** Expose the raw client for complex queries */
  raw: SupabaseClient;
}

export interface ListOpts {
  /** Columns to select (default '*') */
  select?: string;
  /** Additional filters: [column, operator, value] */
  filters?: Array<[string, string, unknown]>;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function orgDb(orgId: string): OrgDb {
  const client = serverDb;

  return {
    async list<T extends Row>(table: string, opts: ListOpts = {}): Promise<T[]> {
      const {
        select    = '*',
        filters   = [],
        orderBy   = 'created_at',
        ascending = false,
        limit,
      } = opts;

      let q = client.from(table).select(select).eq('org_id', orgId);

      for (const [col, op, val] of filters) {
        q = applyFilter(q, col, op, val);
      }

      q = q.order(orderBy, { ascending });
      if (limit) q = q.limit(limit);

      const { data, error } = await q;
      if (error) throw new Error(`[orgDb.list:${table}] ${error.message}`);
      return (data ?? []) as unknown as T[];
    },

    async get<T extends Row>(table: string, id: string): Promise<T | null> {
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('org_id', orgId)
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`[orgDb.get:${table}] ${error.message}`);
      return (data as T) ?? null;
    },

    async insert<T extends Row>(table: string, data: Row): Promise<T> {
      const { data: row, error } = await client
        .from(table)
        .insert({ ...data, org_id: orgId })
        .select()
        .single();
      if (error) throw new Error(`[orgDb.insert:${table}] ${error.message}`);
      return row as T;
    },

    async update<T extends Row>(table: string, id: string, data: Row): Promise<T | null> {
      const { data: row, error } = await client
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`[orgDb.update:${table}] ${error.message}`);
      return (row as T) ?? null;
    },

    async remove(table: string, id: string): Promise<void> {
      const { error } = await client
        .from(table)
        .delete()
        .eq('org_id', orgId)
        .eq('id', id);
      if (error) throw new Error(`[orgDb.remove:${table}] ${error.message}`);
    },

    get raw() { return client; },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(q: any, col: string, op: string, val: unknown): any {
  switch (op) {
    case 'eq':  return q.eq(col, val);
    case 'neq': return q.neq(col, val);
    case 'gt':  return q.gt(col, val);
    case 'gte': return q.gte(col, val);
    case 'lt':  return q.lt(col, val);
    case 'lte': return q.lte(col, val);
    case 'in':  return q.in(col, val as unknown[]);
    case 'like':   return q.like(col, val as string);
    case 'ilike':  return q.ilike(col, val as string);
    case 'is':     return q.is(col, val);
    default:    throw new Error(`[orgDb] unknown filter op: ${op}`);
  }
}
