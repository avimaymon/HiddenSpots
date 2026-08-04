import Dexie, { type Table } from "dexie";
import {
  payloadReferencesClientId,
  rewritePayloadTempIds,
  shouldDeferRetry,
} from "@/lib/offline/id-map";
import { mergeUpdatePayloads, sameLocationUpdate } from "@/lib/offline/coalesce";
import { rewriteEntityCacheIds } from "@/lib/offline/entity-cache";
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

class HiddenSpotsDB extends Dexie {
  locations!: Table<CachedLocation, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  photoBlobs!: Table<PhotoBlobRow, string>;
  idMap!: Table<IdMapRow, string>;

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
  }
}

export const offlineDb = typeof window !== "undefined" ? new HiddenSpotsDB() : null;

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
        await offlineDb.syncQueue.update(item.id!, {
          payload: JSON.stringify(mergeUpdatePayloads(prev, next)),
          createdAt: new Date().toISOString(),
        });
        notifySyncQueue();
        return;
      } catch {
        /* leave corrupt rows */
      }
    }
  }
  await offlineDb.syncQueue.add({
    action,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    retries: 0,
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
  handler: (item: SyncQueueItem) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  if (!offlineDb) return { synced: 0, failed: 0 };

  const run = async () => {
    const items = await offlineDb!.syncQueue.orderBy("createdAt").toArray();
    let synced = 0;
    let failed = 0;
    const now = Date.now();
    for (const item of items) {
      if ((item.retries ?? 0) >= MAX_RETRIES) continue;
      if (shouldDeferRetry(item.retries ?? 0, item.createdAt, now)) continue;
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
