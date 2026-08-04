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

export function shouldDeferRetry(retries: number, createdAt: string, now = Date.now()): boolean {
  if (retries <= 0) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  // Exponential backoff: 3s, 6s, 12s, … capped ~5m
  const delay = Math.min(300_000, 3000 * 2 ** Math.min(retries, 7));
  return now < created + delay;
}
