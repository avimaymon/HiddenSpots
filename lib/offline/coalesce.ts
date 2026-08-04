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
