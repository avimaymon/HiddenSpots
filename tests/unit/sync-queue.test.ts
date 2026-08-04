import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Last-write-wins queue ordering: items flush FIFO by createdAt.
 * Later enqueued mutations for the same entity win because they apply last.
 */

type SyncAction =
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

type SyncQueueItem = {
  id?: number;
  action: SyncAction;
  payload: string;
  createdAt: string;
  retries: number;
};

const queue: SyncQueueItem[] = [];
let nextId = 1;

async function enqueueSync(action: SyncQueueItem["action"], payload: object) {
  queue.push({
    id: nextId++,
    action,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    retries: 0,
  });
  // ensure distinct timestamps for ordering tests
  await new Promise((r) => setTimeout(r, 2));
}

async function flushSyncQueue(handler: (item: SyncQueueItem) => Promise<void>) {
  const items = [...queue].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  for (const item of items) {
    await handler(item);
    const idx = queue.findIndex((q) => q.id === item.id);
    if (idx >= 0) queue.splice(idx, 1);
  }
}

vi.mock("@/lib/actions/locations", () => ({
  setFavorite: vi.fn().mockResolvedValue(undefined),
  createLocation: vi.fn().mockResolvedValue({ id: "srv-new" }),
  updateLocation: vi.fn().mockResolvedValue(undefined),
  deleteLocation: vi.fn().mockResolvedValue(undefined),
  addLocationPhoto: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/actions/visits", () => ({
  createVisit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/actions/tracks", () => ({
  saveTrack: vi.fn().mockResolvedValue({ id: "t1" }),
}));

vi.mock("@/lib/actions/collections", () => ({
  addLocationToCollection: vi.fn().mockResolvedValue(undefined),
  removeLocationFromCollection: vi.fn().mockResolvedValue(undefined),
  createCollection: vi.fn().mockResolvedValue({ id: "srv-col" }),
}));

vi.mock("@/lib/actions/trips", () => ({
  addLocationToTrip: vi.fn().mockResolvedValue(undefined),
  removeLocationFromTrip: vi.fn().mockResolvedValue(undefined),
  createTrip: vi.fn().mockResolvedValue({ id: "srv-trip" }),
}));

vi.mock("@/lib/offline/db", () => ({
  flushSyncQueue: vi.fn(),
  pendingSyncCount: vi.fn().mockResolvedValue(0),
  failedSyncCount: vi.fn().mockResolvedValue(0),
  getSyncQueueSummary: vi.fn().mockResolvedValue({ pending: 0, failed: 0 }),
  dropStuckSyncItems: vi.fn().mockResolvedValue(0),
  takePhotoBlob: vi.fn(),
  deletePhotoBlob: vi.fn(),
  resolveLocationId: vi.fn(async (id: string) => id),
  resolveMappedId: vi.fn(async (id: string) => id),
  remapClientLocationId: vi.fn(),
  remapClientTempId: vi.fn(),
}));

import { processSyncItem } from "@/hooks/use-sync-queue";
import { updateLocation, deleteLocation, setFavorite } from "@/lib/actions/locations";
import {
  addLocationToCollection,
  removeLocationFromCollection,
  createCollection,
} from "@/lib/actions/collections";
import {
  addLocationToTrip,
  removeLocationFromTrip,
  createTrip,
} from "@/lib/actions/trips";
import { remapClientTempId } from "@/lib/offline/db";

describe("sync queue last-write-wins", () => {
  beforeEach(() => {
    queue.length = 0;
    nextId = 1;
    vi.clearAllMocks();
  });

  it("flushes in createdAt order so later writes win", async () => {
    const applyOrder: string[] = [];

    await enqueueSync("update", { locationId: "loc1", title: "A" });
    await enqueueSync("update", { locationId: "loc1", title: "B" });
    await enqueueSync("update", { locationId: "loc1", title: "C" });

    await flushSyncQueue(async (item) => {
      const payload = JSON.parse(item.payload) as { title: string };
      applyOrder.push(payload.title);
      await processSyncItem(item);
    });

    expect(applyOrder).toEqual(["A", "B", "C"]);
    expect(updateLocation).toHaveBeenCalledTimes(3);
    expect(vi.mocked(updateLocation).mock.calls[2][1]).toMatchObject({ title: "C" });
    expect(queue).toHaveLength(0);
  });

  it("processSyncItem routes actions", async () => {
    await processSyncItem({
      action: "favorite",
      payload: JSON.stringify({ locationId: "x" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(setFavorite).toHaveBeenCalledWith("x", true);

    await processSyncItem({
      action: "delete",
      payload: JSON.stringify({ locationId: "y" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(deleteLocation).toHaveBeenCalledWith("y");

    await processSyncItem({
      action: "collection-add",
      payload: JSON.stringify({ collectionId: "c1", locationId: "l1" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(addLocationToCollection).toHaveBeenCalledWith("c1", "l1");

    await processSyncItem({
      action: "collection-remove",
      payload: JSON.stringify({ collectionId: "c1", locationId: "l1" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(removeLocationFromCollection).toHaveBeenCalledWith("c1", "l1");

    await processSyncItem({
      action: "trip-add",
      payload: JSON.stringify({ tripId: "t1", locationId: "l2" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(addLocationToTrip).toHaveBeenCalledWith("t1", "l2");

    await processSyncItem({
      action: "trip-remove",
      payload: JSON.stringify({ tripId: "t1", locationId: "l2" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(removeLocationFromTrip).toHaveBeenCalledWith("t1", "l2");

    await processSyncItem({
      action: "collection-create",
      payload: JSON.stringify({ name: "מפלים", color: "#22c55e", clientId: "tmp-col" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(createCollection).toHaveBeenCalledWith({ name: "מפלים", color: "#22c55e" });
    expect(remapClientTempId).toHaveBeenCalledWith("tmp-col", "srv-col");

    await processSyncItem({
      action: "trip-create",
      payload: JSON.stringify({ name: "צפון", clientId: "tmp-trip" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(createTrip).toHaveBeenCalledWith({ name: "צפון" });
    expect(remapClientTempId).toHaveBeenCalledWith("tmp-trip", "srv-trip");
  });

  it("rejects unknown actions", async () => {
    await expect(
      processSyncItem({
        action: "nope" as SyncAction,
        payload: "{}",
        createdAt: new Date().toISOString(),
        retries: 0,
      })
    ).rejects.toThrow(/Unknown sync action/);
  });
});
