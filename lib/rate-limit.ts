/**
 * Rate limiting with an Upstash-first, in-memory fallback strategy.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 * all serverless instances share the same counter (recommended for production).
 * Otherwise falls back to a per-instance in-memory Map (fine for single-server or dev).
 *
 * ponytail: no @upstash/ratelimit dep — uses their REST API directly via fetch.
 * Ceiling: in-memory map is not shared across serverless instances; use Upstash for multi-instance.
 */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

// ─── In-memory fallback ──────────────────────────────────────────────────────

const buckets = new Map<string, { count: number; resetAt: number }>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }, 120_000).unref?.();
}

function inMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) return { ok: false, remaining: 0 };

  bucket.count++;
  return { ok: true, remaining: limit - bucket.count };
}

// ─── Upstash REST rate limit ─────────────────────────────────────────────────

async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowSec = Math.ceil(windowMs / 1000);

  // INCR + EXPIRE in a single pipeline to minimise round-trips
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSec, "NX"], // NX: only set expiry on first call
    ]),
    // ponytail: no retry on transient failure — fall back to allow on error
  });

  if (!res.ok) {
    // Allow on transient Upstash error; don't block the user
    return { ok: true, remaining: limit };
  }

  const [[, count]] = await res.json() as [[null, number]];
  const remaining = Math.max(0, limit - count);
  return { ok: count <= limit, remaining };
}

// ─── Public API ──────────────────────────────────────────────────────────────

const HAS_UPSTASH =
  typeof process !== "undefined" &&
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): Promise<RateLimitResult> {
  if (HAS_UPSTASH) {
    return upstashRateLimit(key, limit, windowMs);
  }
  return inMemoryRateLimit(key, limit, windowMs);
}

/**
 * Synchronous variant kept for backwards compatibility with callers that
 * haven't been updated to async yet. Uses in-memory only.
 * @deprecated Prefer the async `rateLimit` which can use Upstash.
 */
export function rateLimitSync(
  key: string,
  limit = 30,
  windowMs = 60_000
): RateLimitResult {
  return inMemoryRateLimit(key, limit, windowMs);
}
