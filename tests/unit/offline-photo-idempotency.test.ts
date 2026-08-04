import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A queued photo is the one offline write that costs something irreversible
 * before the database row exists: `/api/upload` puts bytes in blob storage,
 * and only then does `addLocationPhoto` run. If that second step fails, the
 * item is retried — and the original code re-uploaded from the blob every
 * time, leaving an orphaned object in storage per attempt (up to 8, with no
 * row ever pointing at them, so nothing could later clean them up).
 *
 * These tests pin the contract that makes the retry cheap and safe: the
 * uploaded URL is written back to the queue row *before* the fallible call,
 * and the blob id travels as the photo's idempotency key.
 */

const upload = vi.fn();
vi.stubGlobal("fetch", upload);

vi.mock("@/lib/actions/locations", () => ({
  setFavorite: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
  addLocationPhoto: vi.fn(),
}));

vi.mock("@/lib/actions/visits", () => ({ createVisit: vi.fn() }));
vi.mock("@/lib/actions/tracks", () => ({ saveTrack: vi.fn() }));
vi.mock("@/lib/actions/collections", () => ({
  addLocationToCollection: vi.fn(),
  removeLocationFromCollection: vi.fn(),
  createCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));
vi.mock("@/lib/actions/trips", () => ({
  addLocationToTrip: vi.fn(),
  removeLocationFromTrip: vi.fn(),
  reorderTripLocations: vi.fn(),
  createTrip: vi.fn(),
  deleteTrip: vi.fn(),
}));

vi.mock("@/lib/offline/db", () => ({
  flushSyncQueue: vi.fn(),
  pendingSyncCount: vi.fn(),
  failedSyncCount: vi.fn(),
  getSyncQueueSummary: vi.fn(),
  dropStuckSyncItems: vi.fn(),
  takePhotoBlob: vi.fn(),
  deletePhotoBlob: vi.fn(),
  persistSyncPayload: vi.fn(),
  resolveLocationId: vi.fn(async (id: string) => id),
  resolveMappedId: vi.fn(async (id: string) => id),
  remapClientLocationId: vi.fn(),
  remapClientTempId: vi.fn(),
}));

import { processSyncItem } from "@/hooks/use-sync-queue";
import { addLocationPhoto } from "@/lib/actions/locations";
import {
  takePhotoBlob,
  deletePhotoBlob,
  persistSyncPayload,
} from "@/lib/offline/db";

const item = (payload: object) => ({
  id: 7,
  action: "upload-photo" as const,
  payload: JSON.stringify(payload),
  createdAt: new Date().toISOString(),
  retries: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(takePhotoBlob).mockResolvedValue({
    id: "blob-1",
    locationId: "loc-1",
    data: new Blob(["bytes"]),
    mimeType: "image/jpeg",
    isPrimary: true,
    createdAt: new Date().toISOString(),
  } as never);
  upload.mockResolvedValue({
    ok: true,
    json: async () => ({ url: "https://blob.example/p.jpg" }),
  });
});

describe("offline photo upload idempotency", () => {
  it("records the uploaded URL on the queue row before the write that can fail", async () => {
    vi.mocked(addLocationPhoto).mockRejectedValueOnce(new Error("network lost"));

    await expect(processSyncItem(item({ blobId: "blob-1" }))).rejects.toThrow(
      "network lost"
    );

    // Ordering is the whole point: had this run after addLocationPhoto, the
    // failure would have skipped it and the retry would re-upload.
    expect(persistSyncPayload).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ url: "https://blob.example/p.jpg", locationId: "loc-1" })
    );
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("reuses the stored URL on retry instead of uploading a second copy", async () => {
    // The row as the failed attempt above left it.
    await processSyncItem(
      item({
        blobId: "blob-1",
        url: "https://blob.example/p.jpg",
        locationId: "loc-1",
        isPrimary: true,
      })
    );

    expect(upload).not.toHaveBeenCalled();
    expect(takePhotoBlob).not.toHaveBeenCalled();
    expect(addLocationPhoto).toHaveBeenCalledWith(
      "loc-1",
      "https://blob.example/p.jpg",
      true,
      "blob-1"
    );
  });

  it("passes the blob id as the server-side idempotency key", async () => {
    await processSyncItem(item({ blobId: "blob-1" }));

    // Without this the server cannot tell a retry from a second photo, so a
    // lost response would leave the spot with two identical images.
    expect(addLocationPhoto).toHaveBeenCalledWith(
      "loc-1",
      "https://blob.example/p.jpg",
      true,
      "blob-1"
    );
  });

  it("releases the blob once the row exists, on both paths", async () => {
    await processSyncItem(item({ blobId: "blob-1" }));
    expect(deletePhotoBlob).toHaveBeenCalledWith("blob-1");

    vi.clearAllMocks();
    await processSyncItem(
      item({ blobId: "blob-1", url: "https://blob.example/p.jpg", locationId: "loc-1" })
    );
    expect(deletePhotoBlob).toHaveBeenCalledWith("blob-1");
  });

  it("rejects a payload with neither a blob nor a usable URL", async () => {
    await expect(
      processSyncItem(item({ locationId: "loc-1", url: "blob:local-preview" }))
    ).rejects.toThrow("Invalid offline photo payload");
    expect(upload).not.toHaveBeenCalled();
  });
});
