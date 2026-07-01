const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  bucket.count++;
  return { ok: true, remaining: limit - bucket.count };
}

/** Prune stale buckets periodically (serverless warm instances) */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }, 120_000).unref?.();
}
