import { headers } from 'next/headers';

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Returns the org ID for the current request.
 * Middleware verifies the JWT and sets the `x-org-id` request header.
 * Falls back to the ORG_ID env var (single-tenant / dev mode).
 */
export async function getOrgId(): Promise<string> {
  try {
    const h = await headers();
    const id = h.get('x-org-id');
    if (id) return id;
  } catch {
    // headers() throws outside of a request context (e.g. build time)
  }
  return process.env.ORG_ID ?? DEFAULT_ORG_ID;
}
