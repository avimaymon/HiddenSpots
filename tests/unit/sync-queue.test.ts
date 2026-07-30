import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Last-write-wins queue ordering: items flush FIFO by createdAt.
 * Later enqueued mutations for the same entity win because they apply last.
 */

type SyncAction = "create" | "update" | "delete" | "favorite" | "visit" | "unfavorite" | "upload-photo";

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
  toggleFavorite: vi.fn().mockResolvedValue(undefined),
  createLocation: vi.fn().mockResolvedValue(undefined),
  updateLocation: vi.fn().mockResolvedValue(undefined),
  deleteLocation: vi.fn().mockResolvedValue(undefined),
  addLocationPhoto: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/actions/visits", () => ({
  createVisit: vi.fn().mockResolvedValue(undefined),
}));

import { processSyncItem } from "@/hooks/use-sync-queue";
import { updateLocation, deleteLocation, toggleFavorite } from "@/lib/actions/locations";

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
    expect(toggleFavorite).toHaveBeenCalledWith("x");

    await processSyncItem({
      action: "delete",
      payload: JSON.stringify({ locationId: "y" }),
      createdAt: new Date().toISOString(),
      retries: 0,
    });
    expect(deleteLocation).toHaveBeenCalledWith("y");
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
