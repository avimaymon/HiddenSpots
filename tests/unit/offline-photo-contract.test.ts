import { describe, it, expect } from "vitest";
import type { SyncQueueItem } from "@/lib/offline/db";

describe("offline sync contract", () => {
  it("upload-photo and save-track are valid sync actions", () => {
    const photo: SyncQueueItem["action"] = "upload-photo";
    const track: SyncQueueItem["action"] = "save-track";
    expect(photo).toBe("upload-photo");
    expect(track).toBe("save-track");
  });

  it("upload-photo payload shape includes blobId", () => {
    const payload = {
      locationId: "loc1",
      blobId: "blob-1",
      isPrimary: true,
    };
    expect(payload.blobId).toBeTruthy();
    expect(payload.locationId).toBeTruthy();
  });
});
