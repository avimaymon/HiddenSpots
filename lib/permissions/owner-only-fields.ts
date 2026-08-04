/** Fields only the location owner may mutate (not EDIT share collaborators). */
export const OWNER_ONLY_LOCATION_KEYS = [
  "privateNotes",
  "privacy",
  "fuzzyCoordinates",
  "fuzzyRadiusMeters",
] as const;

export type OwnerOnlyLocationKey = (typeof OWNER_ONLY_LOCATION_KEYS)[number];

/** Remove owner-only keys from a partial location update payload. */
export function stripOwnerOnlyLocationFields<T extends Record<string, unknown>>(
  data: T
): Omit<T, OwnerOnlyLocationKey> {
  const next = { ...data };
  for (const key of OWNER_ONLY_LOCATION_KEYS) {
    delete next[key];
  }
  return next as Omit<T, OwnerOnlyLocationKey>;
}
