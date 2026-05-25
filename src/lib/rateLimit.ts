/**
 * Production-safe rate limiting.
 *
 * Backend priority (first configured wins):
 *  1. Upstash Redis REST  — UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *     Recommended for Vercel serverless: stateless HTTP, no persistent TCP connection.
 *     → Get from: https://console.upstash.com → Redis → REST API
 *  2. Generic Redis TCP   — REDIS_URL  (ioredis, for self-hosted Redis)
 *  3. In-memory           — Zero config, zero persistence across cold starts.
 *     Fine for single-region low-traffic dev; NOT suitable for production scale.
 *
 * Algorithm: fixed window (Upstash + in-memory) / INCR+EXPIRE (ioredis)
 */

export interface RateLimitOptions {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
}

// ── 1. Upstash REST ────────────────────────────────────────────────────────────

async function upstashCheck(key: string, opts: RateLimitOptions): Promise<boolean | null> {
  const restUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!restUrl || !restToken) return null; // not configured

  const windowSec = Math.ceil(opts.windowMs / 1000);
  const fullKey   = `rl:${key}`;

  try {
    // Pipeline: INCR + EXPIRE in one round-trip
    const res = await fetch(`${restUrl}/pipeline`, {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${restToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR',   fullKey],
        ['EXPIRE', fullKey, windowSec],
      ]),
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return null; // degraded — fall through to next backend

    const data = await res.json() as [{ result: number }, { result: number }];
    const count = data[0]?.result ?? 999;
    return count <= opts.max;
  } catch {
    return null; // network error — fall through
  }
}

// ── 2. ioredis TCP ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ioredis: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getIoredis(): any {
  if (!process.env.REDIS_URL) return null;
  if (_ioredis) return _ioredis;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: IORedis } = require('ioredis') as { default: new (url: string, opts: object) => unknown };
    _ioredis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck:     false,
      lazyConnect:          true,
      connectTimeout:       2000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_ioredis as any).on('error', (err: Error) => {
      console.warn('[rateLimit] Redis TCP error — will use in-memory:', err.message);
      _ioredis = null;
    });
  } catch {
    console.warn('[rateLimit] ioredis not available — using in-memory fallback');
  }
  return _ioredis;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ioredisCheck(client: any, key: string, opts: RateLimitOptions): Promise<boolean | null> {
  try {
    const windowSec = Math.ceil(opts.windowMs / 1000);
    const fullKey   = `rl:${key}`;
    const [[, count]] = (await client
      .multi()
      .incr(fullKey)
      .expire(fullKey, windowSec)
      .exec()) as [[null, number], [null, number]];
    return count <= opts.max;
  } catch {
    return null;
  }
}

// ── 3. In-memory fallback ─────────────────────────────────────────────────────
// WARNING: resets on every cold start — not shared across instances.

const _memStore = new Map<string, { count: number; reset: number }>();

function memCheck(key: string, opts: RateLimitOptions): boolean {
  const now   = Date.now();
  const entry = _memStore.get(key);
  if (!entry || now > entry.reset) {
    _memStore.set(key, { count: 1, reset: now + opts.windowMs });
    return true;
  }
  if (entry.count >= opts.max) return false;
  entry.count++;
  return true;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns `true` if the request is within limits, `false` if it should be rejected.
 *
 * @param key   Identifier for the rate limit bucket, e.g. `"1.2.3.4:whatsapp-send"`
 * @param opts  Window size and max requests
 *
 * @example
 * const allowed = await checkRateLimit(`${ip}:whatsapp`, { windowMs: 60_000, max: 5 });
 * if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<boolean> {
  // Try Upstash REST first (recommended for Vercel serverless)
  const upstash = await upstashCheck(key, opts);
  if (upstash !== null) return upstash;

  // Try ioredis TCP
  const redis = getIoredis();
  if (redis) {
    const result = await ioredisCheck(redis, key, opts);
    if (result !== null) return result;
  }

  // Final fallback: in-memory
  return memCheck(key, opts);
}
