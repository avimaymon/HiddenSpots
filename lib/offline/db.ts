import Dexie, { type Table } from "dexie";

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
  action: "create" | "update" | "delete" | "favorite" | "visit" | "unfavorite" | "upload-photo";
  payload: string;
  createdAt: string;
  retries: number;
  lastError?: string;
}

class HiddenSpotsDB extends Dexie {
  locations!: Table<CachedLocation, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("HiddenSpotsDB");
    this.version(2).stores({
      locations: "id, updatedAt, isFavorite, isVisited",
      syncQueue: "++id, createdAt, action",
    });
    // v3: lastError on queue items (schema-less extra fields are fine in Dexie)
    this.version(3).stores({
      locations: "id, updatedAt, isFavorite, isVisited",
      syncQueue: "++id, createdAt, action, retries",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new HiddenSpotsDB() : null;

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
  await offlineDb.locations.bulkPut(
    locations.map((l) => ({
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
    }))
  );
}

export async function getOfflineLocations(): Promise<CachedLocation[]> {
  if (!offlineDb) return [];
  return offlineDb.locations.toArray();
}

export async function enqueueSync(
  action: SyncQueueItem["action"],
  payload: object
) {
  if (!offlineDb) return;
  await offlineDb.syncQueue.add({
    action,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

const MAX_RETRIES = 8;

export async function flushSyncQueue(
  handler: (item: SyncQueueItem) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  if (!offlineDb) return { synced: 0, failed: 0 };
  const items = await offlineDb.syncQueue.orderBy("createdAt").toArray();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await handler(item);
      await offlineDb.syncQueue.delete(item.id!);
      synced++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : "sync failed";
      await offlineDb.syncQueue.update(item.id!, {
        retries: (item.retries ?? 0) + 1,
        lastError: msg.slice(0, 200),
      });
    }
  }
  return { synced, failed };
}

export async function pendingSyncCount(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.syncQueue.count();
}

/** Items that failed at least once (still in queue). */
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

/** Drop stuck items so the queue can move on (user-initiated). */
export async function dropStuckSyncItems(): Promise<number> {
  if (!offlineDb) return 0;
  const stuck = await offlineDb.syncQueue.filter((i) => (i.retries ?? 0) >= MAX_RETRIES).toArray();
  await Promise.all(stuck.map((i) => offlineDb!.syncQueue.delete(i.id!)));
  return stuck.length;
}
