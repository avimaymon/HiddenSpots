import Dexie, { type Table } from "dexie";
import {
  payloadReferencesClientId,
  rewritePayloadTempIds,
  shouldDeferRetry,
} from "@/lib/offline/id-map";
import {
  mergeUpdatePayloads,
  orderSyncQueue,
  sameLocationUpdate,
} from "@/lib/offline/coalesce";
import { rewriteEntityCacheIds } from "@/lib/offline/entity-cache";
import {
  isOfflineLocalStorageKey,
  shouldClaimForUser,
  shouldPurgeForUser,
} from "@/lib/offline/scope";
import { selectOfflineAtlasPack } from "@/lib/offline/atlas-pack";

export { selectOfflineAtlasPack } from "@/lib/offline/atlas-pack";

export interface CachedLocation {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  categoryColor: string;
  categoryIcon: string;
  isFavorite: boolean;
  isVisited: boolean;
  coverPhotoUrl: string | null;
  updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  /**
   * Monotonic flush order, assigned at enqueue and never rewritten. Distinct
   * from `createdAt`, which coalescing updates — see orderSyncQueue.
   */
  seq?: number;
  action:
    | "create"
    | "update"
    | "delete"
    | "favorite"
    | "visit"
    | "unfavorite"
    | "upload-photo"
    | "save-track"
    | "collection-add"
    | "collection-remove"
    | "collection-create"
    | "trip-add"
    | "trip-remove"
    | "trip-create"
    | "trip-delete"
    | "trip-reorder"
    | "collection-delete";
  payload: string;
  createdAt: string;
  retries: number;
  lastError?: string;
  /** When the last flush attempt failed — drives the retry backoff. */
  lastAttemptAt?: string;
}

export interface PhotoBlobRow {
  id: string;
  locationId: string;
  mimeType: string;
  isPrimary: boolean;
  /** Stored as ArrayBuffer for Dexie */
  data: ArrayBuffer;
  createdAt: string;
}

/** Offline create temp id → server id after sync. */
export interface IdMapRow {
  clientId: string;
  serverId: string;
  createdAt: string;
}

/** Single-row bookkeeping (currently just which account owns this store). */
export interface MetaRow {
  key: string;
  value: string;
}

const OWNER_META_KEY = "ownerUserId";

class HiddenSpotsDB extends Dexie {
  locations!: Table<CachedLocation, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  photoBlobs!: Table<PhotoBlobRow, string>;
  idMap!: Table<IdMapRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("HiddenSpotsDB");
    this.version(2).stores({
      locations: "id, updatedAt, isFavorite, isVisited",
      syncQueue: "++id, createdAt, action",
    });
    this.version(3).stores({
      locations: "id, updatedAt, isFavorite, isVisited",
      syncQueue: "++id, createdAt, action, retries",
    });
    this.version(4).stores({
      locations: "id, updatedAt, isFavorite, isVisited",
      syncQueue: "++id, createdAt, action, retries",
      photoBlobs: "id, locationId, createdAt",
    });
    this.version(5).stores({
      locations: "id, updatedAt, isFavorite, isVisited",
      syncQueue: "++id, createdAt, action, retries",
      photoBlobs: "id, locationId, createdAt",
      idMap: "clientId, serverId",
    });
    // v6 lands account scoping, `seq` ordering and `lastAttemptAt` together.
    // Splitting them across releases would strand PWA clients — which hold a
    // cached service worker — on intermediate versions.
    this.version(6)
      .stores({
        locations: "id, updatedAt, isFavorite, isVisited",
        syncQueue: "++id, seq, createdAt, action, retries",
        photoBlobs: "id, locationId, createdAt",
        idMap: "clientId, serverId",
        meta: "key",
      })
      .upgrade(async (tx) => {
        // Pre-v6 rows carry no owner, so there is no way to tell whose pending
        // writes these are. Dropping them is the safe failure mode; claiming
        // them for whoever signs in next is precisely the bug being fixed.
        await tx.table("syncQueue").clear();
        await tx.table("photoBlobs").clear();
        await tx.table("idMap").clear();
        // The locations table is read-only display data, re-populated on the
        // next fetch, so it can stay — but it must not outlive a user switch,
        // which assertOfflineOwner handles.
      });
  }
}

export const offlineDb = typeof window !== "undefined" ? new HiddenSpotsDB() : null;

// ─── Account scoping ─────────────────────────────────────────────────────────

/** Wipe every trace of the offline store. Safe to call when signed out. */
export async function purgeOfflineData(): Promise<void> {
  if (!offlineDb) return;
  await Promise.all([
    offlineDb.syncQueue.clear(),
    offlineDb.photoBlobs.clear(),
    offlineDb.idMap.clear(),
    offlineDb.locations.clear(),
    offlineDb.meta.clear(),
  ]).catch(() => undefined);

  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isOfflineLocalStorageKey(key)) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
  } catch {
    /* private mode */
  }

  notifySyncQueue();
}

/**
 * Claim the store for `userId`, or purge it if it belongs to someone else.
 *
 * Called at the top of every flush rather than only on sign-out: a tab closed
 * mid-session, a server-side session expiry, or a sign-out in another tab all
 * skip the sign-out path, and any of them would otherwise leave one account's
 * pending writes to drain into the next account that signs in.
 *
 * Returns true when the caller may proceed with the store.
 */
export async function assertOfflineOwner(userId: string): Promise<boolean> {
  if (!offlineDb || !userId) return Boolean(offlineDb);

  const row = await offlineDb.meta.get(OWNER_META_KEY).catch(() => undefined);
  const stored = row?.value ?? null;

  if (shouldPurgeForUser(stored, userId)) {
    await purgeOfflineData();
    await offlineDb.meta.put({ key: OWNER_META_KEY, value: userId });
    return false;
  }

  if (shouldClaimForUser(stored, userId)) {
    await offlineDb.meta.put({ key: OWNER_META_KEY, value: userId });
  }

  return true;
}

/** Which account this store currently belongs to, if any. */
export async function getOfflineOwner(): Promise<string | null> {
  if (!offlineDb) return null;
  const row = await offlineDb.meta.get(OWNER_META_KEY).catch(() => undefined);
  return row?.value ?? null;
}

const OFFLINE_ATLAS_PACK_MAX = 800;

export async function cacheLocationsForOffline(
  locations: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    category: { color: string; icon: string } | null;
    isFavorite: boolean;
    isVisited: boolean;
    coverPhotoUrl?: string | null;
    photos?: { url: string }[];
  }[]
) {
  if (!offlineDb) return;
  const mapped = locations.map((l) => ({
    id: l.id,
    title: l.title,
    latitude: l.latitude,
    longitude: l.longitude,
    categoryColor: l.category?.color ?? "#22c55e",
    categoryIcon: l.category?.icon ?? "map-pin",
    isFavorite: l.isFavorite,
    isVisited: l.isVisited,
    coverPhotoUrl: l.photos?.[0]?.url ?? l.coverPhotoUrl ?? null,
    updatedAt: new Date().toISOString(),
  }));
  // Keep previously packed favorites/visited so pan-only sessions don't wipe the pack.
  const existing = await offlineDb.locations.toArray();
  const pack = selectOfflineAtlasPack([...existing, ...mapped], OFFLINE_ATLAS_PACK_MAX);
  await offlineDb.locations.bulkPut(pack);
}

export async function getOfflineLocations(): Promise<CachedLocation[]> {
  if (!offlineDb) return [];
  return offlineDb.locations.toArray();
}

export async function getOfflineLocation(id: string): Promise<CachedLocation | undefined> {
  if (!offlineDb) return undefined;
  return offlineDb.locations.get(id);
}

/** Drop a pending/cached spot from Dexie (and any queued photo blobs for it). */
export async function removeOfflineLocation(id: string): Promise<void> {
  if (!offlineDb || !id) return;
  await offlineDb.locations.delete(id);
  const blobs = await offlineDb.photoBlobs.where("locationId").equals(id).toArray();
  await Promise.all(blobs.map((b) => offlineDb!.photoBlobs.delete(b.id)));
}

export async function patchCachedLocation(
  id: string,
  patch: Partial<Pick<CachedLocation, "title" | "latitude" | "longitude" | "isFavorite" | "isVisited" | "coverPhotoUrl" | "categoryColor" | "categoryIcon">>
): Promise<void> {
  if (!offlineDb || !id) return;
  const row = await offlineDb.locations.get(id);
  if (!row) return;
  await offlineDb.locations.put({
    ...row,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/** Patch a queued offline `create` payload (pending temp id) — not a separate update. */
export async function patchPendingCreatePayload(
  clientId: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  if (!offlineDb || !clientId) return false;
  const items = await offlineDb.syncQueue.filter((i) => i.action === "create").toArray();
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload) as Record<string, unknown>;
      if (payload.clientId !== clientId) continue;
      await offlineDb.syncQueue.update(item.id!, {
        payload: JSON.stringify({ ...payload, ...patch }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("hs:sync-queue"));
      }
      return true;
    } catch {
      /* skip corrupt */
    }
  }
  return false;
}

function notifySyncQueue() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hs:sync-queue"));
  }
}

export async function enqueueSync(
  action: SyncQueueItem["action"],
  payload: object
) {
  if (!offlineDb) return;
  // Coalesce location updates so bucket toggles + edits don't stack forever.
  if (action === "update") {
    const next = payload as Record<string, unknown>;
    const pending = await offlineDb.syncQueue.filter((i) => i.action === "update").toArray();
    for (const item of pending) {
      try {
        const prev = JSON.parse(item.payload) as Record<string, unknown>;
        if (!sameLocationUpdate(prev, next)) continue;
        // Payload only. Touching `seq` or `createdAt` would move the merged
        // update behind operations enqueued after it — an update → delete →
        // update sequence then flushed as delete, update and lost the edit.
        await offlineDb.syncQueue.update(item.id!, {
          payload: JSON.stringify(mergeUpdatePayloads(prev, next)),
        });
        notifySyncQueue();
        return;
      } catch {
        /* leave corrupt rows */
      }
    }
  }

  // Assign `seq` inside a transaction so two concurrent enqueues cannot read
  // the same high-water mark and collide.
  await offlineDb.transaction("rw", offlineDb.syncQueue, async () => {
    const last = await offlineDb!.syncQueue.orderBy("seq").last();
    await offlineDb!.syncQueue.add({
      seq: (last?.seq ?? 0) + 1,
      action,
      payload: JSON.stringify(payload),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
  });
  notifySyncQueue();
}

/** Store photo bytes for later upload; returns blob id for the sync queue. */
export async function storePhotoBlob(opts: {
  locationId: string;
  file: File;
  isPrimary: boolean;
}): Promise<string> {
  if (!offlineDb) throw new Error("Offline DB unavailable");
  const id = crypto.randomUUID();
  const data = await opts.file.arrayBuffer();
  await offlineDb.photoBlobs.put({
    id,
    locationId: opts.locationId,
    mimeType: opts.file.type || "image/jpeg",
    isPrimary: opts.isPrimary,
    data,
    createdAt: new Date().toISOString(),
  });
  await enqueueSync("upload-photo", {
    locationId: opts.locationId,
    blobId: id,
    isPrimary: opts.isPrimary,
  });
  return id;
}

export async function takePhotoBlob(blobId: string): Promise<PhotoBlobRow | undefined> {
  if (!offlineDb) return undefined;
  return offlineDb.photoBlobs.get(blobId);
}

export async function deletePhotoBlob(blobId: string): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.photoBlobs.delete(blobId);
}

const MAX_RETRIES = 8;

export async function rememberIdMapping(clientId: string, serverId: string): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.idMap.put({
    clientId,
    serverId,
    createdAt: new Date().toISOString(),
  });
}

/** Resolve any offline temp id (location / collection / trip) via idMap. */
export async function resolveMappedId(id: string): Promise<string> {
  if (!offlineDb) return id;
  const row = await offlineDb.idMap.get(id);
  return row?.serverId ?? id;
}

export const resolveLocationId = resolveMappedId;

/** Rewrite pending sync ops that still reference a temp client id. */
export async function remapClientTempId(
  clientId: string,
  serverId: string
): Promise<void> {
  if (!offlineDb) return;
  await rememberIdMapping(clientId, serverId);

  const items = await offlineDb.syncQueue.toArray();
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload) as Record<string, unknown>;
      const next = rewritePayloadTempIds(payload, clientId, serverId);
      if (JSON.stringify(next) !== item.payload) {
        await offlineDb.syncQueue.update(item.id!, {
          payload: JSON.stringify(next),
        });
      }
    } catch {
      // leave corrupt payloads for flush to fail visibly
    }
  }

  rewriteEntityCacheIds(clientId, serverId);
}

/** After offline location create syncs, rewrite queue + photo blobs + location cache. */
export async function remapClientLocationId(
  clientId: string,
  serverId: string
): Promise<void> {
  if (!offlineDb) return;
  await remapClientTempId(clientId, serverId);

  const blobs = await offlineDb.photoBlobs.where("locationId").equals(clientId).toArray();
  for (const b of blobs) {
    await offlineDb.photoBlobs.update(b.id, { locationId: serverId });
  }

  const cached = await offlineDb.locations.get(clientId);
  if (cached) {
    await offlineDb.locations.delete(clientId);
    await offlineDb.locations.put({ ...cached, id: serverId });
  }
}

export async function flushSyncQueue(
  handler: (item: SyncQueueItem) => Promise<void>,
  userId?: string
): Promise<{ synced: number; failed: number }> {
  if (!offlineDb) return { synced: 0, failed: 0 };

  // Never drain one account's queue into another's. On a mismatch the store is
  // purged and this flush is abandoned; the fresh store belongs to `userId`.
  if (userId && !(await assertOfflineOwner(userId))) {
    return { synced: 0, failed: 0 };
  }

  const run = async () => {
    const items = orderSyncQueue(await offlineDb!.syncQueue.toArray());
    let synced = 0;
    let failed = 0;
    const now = Date.now();
    for (const item of items) {
      if ((item.retries ?? 0) >= MAX_RETRIES) continue;
      if (shouldDeferRetry(item.retries ?? 0, item.lastAttemptAt, now)) continue;
      try {
        await handler(item);
        await offlineDb!.syncQueue.delete(item.id!);
        synced++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : "sync failed";
        await offlineDb!.syncQueue.update(item.id!, {
          retries: (item.retries ?? 0) + 1,
          lastError: msg.slice(0, 200),
          lastAttemptAt: new Date().toISOString(),
        });
      }
    }
    return { synced, failed };
  };

  // Cross-tab lock when available
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("hiddenspots-sync", run);
  }
  return run();
}

export async function pendingSyncCount(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.syncQueue.count();
}

export async function failedSyncCount(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.syncQueue.filter((i) => (i.retries ?? 0) > 0).count();
}

export async function getSyncQueueSummary(): Promise<{
  pending: number;
  failed: number;
  stuck: number;
  lastError: string | null;
}> {
  if (!offlineDb) return { pending: 0, failed: 0, stuck: 0, lastError: null };
  const items = await offlineDb.syncQueue.toArray();
  const failed = items.filter((i) => (i.retries ?? 0) > 0);
  const stuck = items.filter((i) => (i.retries ?? 0) >= MAX_RETRIES);
  const lastError = failed.sort((a, b) => b.retries - a.retries)[0]?.lastError ?? null;
  return { pending: items.length, failed: failed.length, stuck: stuck.length, lastError };
}

export async function dropStuckSyncItems(): Promise<number> {
  if (!offlineDb) return 0;
  const stuck = await offlineDb.syncQueue.filter((i) => (i.retries ?? 0) >= MAX_RETRIES).toArray();
  await Promise.all(stuck.map((i) => offlineDb!.syncQueue.delete(i.id!)));
  return stuck.length;
}

/**
 * Drop queued ops that still reference a discarded offline temp id
 * (e.g. user deleted a pending trip/collection before sync).
 */
export async function dropSyncItemsMatchingClientId(clientId: string): Promise<number> {
  if (!offlineDb || !clientId) return 0;
  const items = await offlineDb.syncQueue.toArray();
  let dropped = 0;
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload) as Record<string, unknown>;
      if (!payloadReferencesClientId(payload, clientId)) continue;
      await offlineDb.syncQueue.delete(item.id!);
      dropped++;
    } catch {
      /* leave corrupt rows for flush */
    }
  }
  return dropped;
}
