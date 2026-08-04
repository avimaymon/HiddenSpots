const TEMP_ID_KEYS = ["clientId", "locationId", "collectionId", "tripId", "parentId"] as const;

/** True when a sync payload still references an offline temp id. */
export function payloadReferencesClientId(
  payload: Record<string, unknown>,
  clientId: string
): boolean {
  return TEMP_ID_KEYS.some((key) => payload[key] === clientId);
}

/** Rewrite client temp ids → server ids inside sync payloads. */
export function rewritePayloadTempIds(
  payload: Record<string, unknown>,
  clientId: string,
  serverId: string
): Record<string, unknown> {
  const next = { ...payload };
  for (const key of ["locationId", "collectionId", "tripId", "parentId"] as const) {
    if (next[key] === clientId) next[key] = serverId;
  }
  if (next.clientId === clientId) delete next.clientId;
  return next;
}

/** @deprecated alias — prefer rewritePayloadTempIds */
export const rewritePayloadLocationIds = rewritePayloadTempIds;

/**
 * Exponential backoff between retries: 3s, 6s, 12s, … capped at ~5m.
 *
 * Measured from the last attempt, not from enqueue. Measuring from `createdAt`
 * meant anything queued more than five minutes ago — the normal case after an
 * offline trip — was always past its backoff window, so a failing item burned
 * through all its retries in consecutive flushes with no spacing at all.
 *
 * A missing `lastAttemptAt` (rows written before it existed) means "attempt
 * now"; falling back to `createdAt` would reintroduce the bug.
 */
export function shouldDeferRetry(
  retries: number,
  lastAttemptAt: string | undefined | null,
  now = Date.now()
): boolean {
  if (retries <= 0) return false;
  if (!lastAttemptAt) return false;
  const last = new Date(lastAttemptAt).getTime();
  if (Number.isNaN(last)) return false;
  const delay = Math.min(300_000, 3000 * 2 ** Math.min(retries, 7));
  return now < last + delay;
}
