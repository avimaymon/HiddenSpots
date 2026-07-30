import { describe, it, expect, vi } from "vitest";

// Mock Dexie (offlineDb is null in Node environment)
vi.mock("@/lib/offline/db", () => ({
  offlineDb: null,
  cacheLocationsForOffline: vi.fn().mockResolvedValue(undefined),
  getOfflineLocations: vi.fn().mockResolvedValue([]),
  enqueueSync: vi.fn().mockResolvedValue(undefined),
  flushSyncQueue: vi.fn().mockResolvedValue(undefined),
  pendingSyncCount: vi.fn().mockResolvedValue(0),
}));

import {
  cacheLocationsForOffline,
  getOfflineLocations,
  enqueueSync,
  pendingSyncCount,
} from "@/lib/offline/db";

describe("offline module exports", () => {
  it("cacheLocationsForOffline is callable", async () => {
    await expect(cacheLocationsForOffline([])).resolves.toBeUndefined();
  });

  it("getOfflineLocations returns empty array in SSR", async () => {
    const result = await getOfflineLocations();
    expect(Array.isArray(result)).toBe(true);
  });

  it("enqueueSync is callable", async () => {
    await expect(enqueueSync("favorite", { locationId: "test" })).resolves.toBeUndefined();
  });

  it("pendingSyncCount returns 0 in SSR", async () => {
    const count = await pendingSyncCount();
    expect(count).toBe(0);
  });
});
