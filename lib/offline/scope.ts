/**
 * Account scoping for the offline store.
 *
 * Dexie and localStorage are per-origin, not per-account. Nothing in the
 * offline store carried a user id and nothing cleared it on sign-out, so on a
 * shared device user A's queued spots — private notes and photo bytes included
 * — flushed into user B's account the moment B signed in and the queue drained
 * on mount. A's cached atlas also rendered to B before the first fetch.
 *
 * Pure functions live here because the vitest environment is `node`: Dexie and
 * localStorage cannot be exercised directly, so the decision logic is kept
 * separate from the I/O that applies it.
 */

/** Prefixes of every localStorage key the offline store owns. */
export const OFFLINE_LOCAL_STORAGE_PREFIXES = [
  "hs_collections_v1",
  "hs_trips_v1",
  "hs_loc_cols_",
] as const;

/**
 * Whether the local store belongs to someone else and must be discarded.
 *
 * A null `stored` means the store has not been claimed yet (fresh install, or
 * the v6 upgrade cleared it) — claim it rather than purge.
 */
export function shouldPurgeForUser(
  stored: string | null | undefined,
  current: string
): boolean {
  if (!current) return false;
  if (!stored) return false;
  return stored !== current;
}

/** True when the store has no owner yet and the current user should claim it. */
export function shouldClaimForUser(
  stored: string | null | undefined,
  current: string
): boolean {
  return Boolean(current) && !stored;
}

/** True for any localStorage key the offline store owns. */
export function isOfflineLocalStorageKey(key: string): boolean {
  return OFFLINE_LOCAL_STORAGE_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(prefix)
  );
}
