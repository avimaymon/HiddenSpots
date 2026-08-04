import { describe, expect, it } from "vitest";
import { isPendingOfflineId } from "@/lib/offline/pending";

describe("isPendingOfflineId", () => {
  it("detects crypto.randomUUID shape", () => {
    expect(isPendingOfflineId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects Prisma cuid-like ids", () => {
    expect(isPendingOfflineId("clxyz0123456789abcdef")).toBe(false);
    expect(isPendingOfflineId("cmlabc123")).toBe(false);
  });
});
