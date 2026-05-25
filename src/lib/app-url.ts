/**
 * Production-safe application URL helper.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL      — must be set in Vercel env vars
 *  2. VERCEL_URL               — auto-set by Vercel for preview/production deployments
 *  3. http://localhost:3000    — only in NODE_ENV=development
 *
 * In production, if neither NEXT_PUBLIC_APP_URL nor VERCEL_URL is set,
 * the function throws a descriptive error rather than silently using localhost.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // Vercel auto-populates VERCEL_URL for every deployment (no https:// prefix)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // Local dev only
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';

  throw new Error(
    '[app-url] NEXT_PUBLIC_APP_URL is not set in production. ' +
      'Add it to Vercel → Settings → Environment Variables: ' +
      'NEXT_PUBLIC_APP_URL = https://alons-crm.vercel.app',
  );
}
