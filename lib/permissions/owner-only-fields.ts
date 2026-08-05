/** Fields only the location owner may mutate (not EDIT share collaborators). */
export const OWNER_ONLY_LOCATION_KEYS = [
  "privateNotes",
  "privacy",
  "fuzzyCoordinates",
  "fuzzyRadiusMeters",
] as const;

export type OwnerOnlyLocationKey = (typeof OWNER_ONLY_LOCATION_KEYS)[number];

/**
 * Remove owner-only keys from a partial location **update payload**.
 *
 * Deleting is right here and only here: on a write, an absent key means "do not
 * change this". Do not reach for it on a read — see redactOwnerOnlyForRead.
 */
export function stripOwnerOnlyLocationFields<T extends Record<string, unknown>>(
  data: T
): Omit<T, OwnerOnlyLocationKey> {
  const next = { ...data };
  for (const key of OWNER_ONLY_LOCATION_KEYS) {
    delete next[key];
  }
  return next as Omit<T, OwnerOnlyLocationKey>;
}

/**
 * Hide owner-only content on a location being **read** by a collaborator.
 *
 * The read counterpart blanks rather than deletes. Deleting keys from a row the
 * type still describes as complete forces a cast, and that cast then promises
 * callers a `number` where they would actually get `undefined`.
 *
 * Only `privateNotes` is withheld. `privacy`, `fuzzyCoordinates` and
 * `fuzzyRadiusMeters` are deliberately kept: a collaborator has to know a spot
 * is fuzzed and by how much, or the map implies a precision it does not have.
 */
export function redactOwnerOnlyForRead<T extends { privateNotes: string | null }>(
  location: T
): T {
  return { ...location, privateNotes: null };
}
