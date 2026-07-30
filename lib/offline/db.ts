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

export async function flushSyncQueue(
  handler: (item: SyncQueueItem) => Promise<void>
) {
  if (!offlineDb) return;
  const items = await offlineDb.syncQueue.orderBy("createdAt").toArray();
  for (const item of items) {
    try {
      await handler(item);
      await offlineDb.syncQueue.delete(item.id!);
    } catch {
      await offlineDb.syncQueue.update(item.id!, { retries: item.retries + 1 });
    }
  }
}

export async function pendingSyncCount(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.syncQueue.count();
}
