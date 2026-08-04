/** ponytail: localStorage snapshots for offline dialogs. Ceiling: no multi-tab sync — upgrade to Dexie if stale lists hurt. */

export function writeEntityCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function readEntityCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const COLLECTIONS_CACHE_KEY = "hs_collections_v1";
export const TRIPS_CACHE_KEY = "hs_trips_v1";
export const ID_REMAP_EVENT = "hs:id-remap";

export type IdRemapDetail = { clientId: string; serverId: string };

export function locationCollectionsCacheKey(locationId: string): string {
  return `hs_loc_cols_${locationId}`;
}

type IdRow = { id?: string; parentId?: string | null };

/** Rewrite temp ids inside collections/trips localStorage snapshots after sync. */
export function rewriteEntityCacheIds(clientId: string, serverId: string): void {
  for (const key of [COLLECTIONS_CACHE_KEY, TRIPS_CACHE_KEY]) {
    const rows = readEntityCache<IdRow[]>(key);
    if (!rows?.length) continue;
    let changed = false;
    const next = rows.map((row) => {
      let r = row;
      if (r.id === clientId) {
        changed = true;
        r = { ...r, id: serverId };
      }
      if (r.parentId === clientId) {
        changed = true;
        r = { ...r, parentId: serverId };
      }
      return r;
    });
    if (changed) writeEntityCache(key, next);
  }

  // Location→collection membership caches may store temp collection ids
  // and keys keyed by temp location id.
  try {
    const locKey = locationCollectionsCacheKey(clientId);
    const locCols = readEntityCache<string[]>(locKey);
    if (locCols) {
      writeEntityCache(
        locationCollectionsCacheKey(serverId),
        locCols.map((id) => (id === clientId ? serverId : id))
      );
      localStorage.removeItem(locKey);
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("hs_loc_cols_")) continue;
      if (key === locKey) continue;
      const ids = readEntityCache<string[]>(key);
      if (!ids?.includes(clientId)) continue;
      writeEntityCache(
        key,
        ids.map((id) => (id === clientId ? serverId : id))
      );
    }
  } catch {
    /* private mode */
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<IdRemapDetail>(ID_REMAP_EVENT, {
        detail: { clientId, serverId },
      })
    );
  }
}
