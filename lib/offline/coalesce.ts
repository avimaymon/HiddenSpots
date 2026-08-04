/** Merge queued location updates — later fields win (same locationId). */
export function mergeUpdatePayloads(
  prev: Record<string, unknown>,
  next: Record<string, unknown>
): Record<string, unknown> {
  return { ...prev, ...next };
}

export function sameLocationUpdate(
  existingPayload: Record<string, unknown>,
  nextPayload: Record<string, unknown>
): boolean {
  return (
    typeof existingPayload.locationId === "string" &&
    existingPayload.locationId.length > 0 &&
    existingPayload.locationId === nextPayload.locationId
  );
}

/**
 * Flush order for the sync queue.
 *
 * Ordering is by `seq`, a monotonic counter assigned at enqueue, not by
 * `createdAt`. Coalescing an update used to rewrite `createdAt`, which moved
 * the merged operation to the *end* of a queue that was also ordered by
 * `createdAt`: an update → delete → update sequence flushed as delete, update,
 * so the server rejected the update against a deleted row and the edit was
 * silently dropped after its retries ran out.
 *
 * `seq` also avoids two enqueues in the same millisecond tying, which a
 * timestamp cannot distinguish.
 */
export function orderSyncQueue<T extends { seq?: number; id?: number; createdAt?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aSeq = a.seq ?? Number.MAX_SAFE_INTEGER;
    const bSeq = b.seq ?? Number.MAX_SAFE_INTEGER;
    if (aSeq !== bSeq) return aSeq - bSeq;
    // Rows written before `seq` existed fall back to insertion order.
    return (a.id ?? 0) - (b.id ?? 0);
  });
}
