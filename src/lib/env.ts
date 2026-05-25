/**
 * Centralised, typed environment variable access.
 *
 * Uses Zod to validate all required env vars at startup (server side only).
 * In production, missing vars throw a descriptive error during the first
 * server-side request. In development, warnings are printed but the app
 * continues so developers can work with partial configs.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const key = env.ANTHROPIC_API_KEY;
 *
 * NEVER import this in client components — all vars here are server-only.
 */

import { z } from 'zod';

// ── Schema ────────────────────────────────────────────────────────────────────

const EnvSchema = z.object({
  // ── Infrastructure ─────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Supabase ───────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL:  z.string().url('Must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'Service role key is required for server-side DB access'),

  // ── Auth ────────────────────────────────────────────────────────────────────
  SESSION_SECRET: z.string().min(32, 'Must be ≥32 chars. Generate: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'),

  // ── App ─────────────────────────────────────────────────────────────────────
  ORG_ID:          z.string().uuid('Must be a valid UUID').default('00000000-0000-0000-0000-000000000001'),
  AGENT_SECRET:    z.string().min(16).optional(),

  // ── Claude / Anthropic ──────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().startsWith('sk-').optional(),
  CLAUDE_API_KEY:    z.string().startsWith('sk-').optional(),   // legacy alias

  // ── Stripe ──────────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY:    z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID:        z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID:         z.string().optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID:  z.string().optional(),

  // ── Meta / WhatsApp ─────────────────────────────────────────────────────────
  META_WHATSAPP_ACCESS_TOKEN:  z.string().optional(),
  META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  OWNER_PHONE:                 z.string().optional(),
  META_AD_ACCOUNT_ID:          z.string().optional(),
  META_ACCESS_TOKEN:           z.string().optional(),
  META_PAGE_ID:                z.string().optional(),

  // ── Instagram ───────────────────────────────────────────────────────────────
  INSTAGRAM_ACCESS_TOKEN:            z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID:     z.string().optional(),

  // ── Google ──────────────────────────────────────────────────────────────────
  GOOGLE_PLACES_API_KEY:             z.string().optional(),
  GOOGLE_BUSINESS_ACCOUNT_ID:        z.string().optional(),
  GOOGLE_BUSINESS_LOCATION_ID:       z.string().optional(),
  GOOGLE_BUSINESS_CLIENT_ID:         z.string().optional(),
  GOOGLE_BUSINESS_CLIENT_SECRET:     z.string().optional(),
  GOOGLE_BUSINESS_REFRESH_TOKEN:     z.string().optional(),

  // ── App URL ──────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL:  z.string().url().optional(),
  VERCEL_URL:           z.string().optional(),
  VERCEL_ENV:           z.enum(['production', 'preview', 'development']).optional(),

  // ── Observability ────────────────────────────────────────────────────────────
  SENTRY_DSN:           z.string().optional(),
  LEAD_MIN_SCORE:       z.coerce.number().int().min(0).max(100).default(70),
  TECH_ALERT_THRESHOLD_MS: z.coerce.number().int().min(100).default(3000),

  // ── Redis ────────────────────────────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL:   z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL:                z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

// ── Validation ────────────────────────────────────────────────────────────────

function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const isProd = process.env.NODE_ENV === 'production';
    const issues = result.error.issues.map((i) =>
      `  • ${i.path.join('.')} — ${i.message}`
    ).join('\n');

    const message =
      '[env] Environment variable validation failed:\n' + issues + '\n';

    if (isProd) {
      // Hard fail in production — better to crash at startup than serve broken responses
      throw new Error(message);
    } else {
      // Soft warn in development — devs often work with incomplete .env.local
      console.warn(message);
    }
  }

  // Cross-field validation: at least one of ANTHROPIC_API_KEY or CLAUDE_API_KEY must be set
  const data = (result.data ?? {}) as Partial<Env>;
  if (!data.ANTHROPIC_API_KEY && !data.CLAUDE_API_KEY) {
    const msg = '[env] Either ANTHROPIC_API_KEY or CLAUDE_API_KEY must be set for AI features.';
    if (data.NODE_ENV === 'production') throw new Error(msg);
    else console.warn(msg);
  }

  return result.success ? result.data : (result.error as unknown as { data: Env }).data;
}

// ── Lazy singleton ────────────────────────────────────────────────────────────
// Validates once per process. Subsequent imports get the cached result.
let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  _env = validateEnv();
  return _env;
}

// Convenience re-export so callers can do: import { env } from '@/lib/env'
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
