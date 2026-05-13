import type { Redis } from 'ioredis';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

// Lazily initialised so the module is safe to import when Redis is not configured
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redis) return redis;
  try {
    // Dynamic require so the app still starts if ioredis is not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: IORedis } = require('ioredis') as { default: typeof Redis };
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    redis.on('error', (err: Error) => {
      console.warn('[rateLimit] Redis error — falling back to memory:', err.message);
      redis = null;
    });
  } catch {
    console.warn('[rateLimit] ioredis not installed — using in-memory fallback');
  }
  return redis;
}

// ── In-memory fallback ────────────────────────────────────────────────────────
const memStore = new Map<string, { count: number; reset: number }>();

function memCheck(key: string, { windowMs, max }: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.reset) {
    memStore.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ── Redis check (sliding window via MULTI/EXEC) ───────────────────────────────
async function redisCheck(
  client: Redis,
  key: string,
  { windowMs, max }: RateLimitOptions
): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000);
  const [[, count]] = (await client
    .multi()
    .incr(key)
    .expire(key, windowSec)
    .exec()) as [[null, number], [null, number]];
  return count <= max;
}

/**
 * Returns true if the request is within limits, false if it should be rejected.
 * key  — typically `ip:routeName` e.g. `"1.2.3.4:claude"`
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<boolean> {
  const client = getRedis();
  if (client) {
    try {
      return await redisCheck(client, `rl:${key}`, opts);
    } catch {
      // Redis temporarily unavailable — degrade gracefully
    }
  }
  return memCheck(key, opts);
}
