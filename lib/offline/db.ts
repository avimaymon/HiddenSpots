import Dexie, { type Table } from "dexie";

export interface CachedLocation {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  pendingSync?: boolean;
}

class HiddenSpotsDB extends Dexie {
  locations!: Table<CachedLocation, string>;
  syncQueue!: Table<{ id?: number; action: string; payload: string; createdAt: string }, number>;

  constructor() {
    super("HiddenSpotsDB");
    this.version(1).stores({
      locations: "id, updatedAt",
      syncQueue: "++id, createdAt",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new HiddenSpotsDB() : null;

export async function cacheLocationsForOffline(
  locations: { id: string; title: string; latitude: number; longitude: number }[]
) {
  if (!offlineDb) return;
  await offlineDb.locations.bulkPut(
    locations.map((l) => ({ ...l, updatedAt: new Date().toISOString() }))
  );
}
