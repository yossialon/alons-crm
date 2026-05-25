/**
 * Server-side Supabase client — uses the SERVICE ROLE key.
 *
 * Rules:
 *  - NEVER import this file from any client component or browser-visible module.
 *  - Safe only in: API routes, Server Components, agent code, cron handlers.
 *  - Service role bypasses RLS — every query MUST manually enforce org_id.
 *  - The anon key (src/lib/supabase.ts) must NOT be used in API routes.
 *
 * Architecture:
 *  - `serverDb` is exported as a Proxy that lazily initialises a singleton
 *    SupabaseClient on first use. This lets repositories call
 *    `serverDb.from('table')` naturally while keeping env validation deferred
 *    until a real DB call is made (not at `next build` time).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Lazy singleton ─────────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      '[supabase-server] NEXT_PUBLIC_SUPABASE_URL is not set. ' +
        'Add it to .env.local and Vercel environment variables.',
    );
  }
  if (!key) {
    throw new Error(
      '[supabase-server] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'This key is required for all server-side DB operations. ' +
        'It must be kept server-only — never use NEXT_PUBLIC_. ' +
        'Find it in: Supabase Dashboard → Project Settings → API → service_role.',
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession:     false,
      autoRefreshToken:   false,
      detectSessionInUrl: false,
    },
  });
  return _client;
}

// ── Proxy export ───────────────────────────────────────────────────────────────
// `serverDb.from('table')` works identically to a normal SupabaseClient.
// The actual client is only created on the first property access, so modules
// that import this file do NOT fail during `next build` if env vars are absent.

export const serverDb: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    return Reflect.get(getClient(), prop as string);
  },
});

export default serverDb;
