import { describe, it, expect } from "vitest";
import { shareSchema } from "@/lib/validations/schemas";

describe("shareSchema resource cardinality", () => {
  it("accepts exactly one resource", () => {
    expect(shareSchema.safeParse({ locationId: "l1" }).success).toBe(true);
    expect(shareSchema.safeParse({ collectionId: "c1" }).success).toBe(true);
    expect(shareSchema.safeParse({ tripId: "t1" }).success).toBe(true);
  });

  it("rejects a share with no resource", () => {
    expect(shareSchema.safeParse({ permission: "VIEW" }).success).toBe(false);
  });

  it("rejects a share carrying more than one resource", () => {
    // Multi-resource rows bypassed the privacy DTO for every branch after the
    // first, publishing raw privateNotes and true SECRET coordinates.
    expect(shareSchema.safeParse({ locationId: "l1", collectionId: "c1" }).success).toBe(false);
    expect(shareSchema.safeParse({ collectionId: "c1", tripId: "t1" }).success).toBe(false);
    expect(
      shareSchema.safeParse({ locationId: "l1", collectionId: "c1", tripId: "t1" }).success
    ).toBe(false);
  });

  it("treats an empty-string id as absent rather than as a resource", () => {
    expect(shareSchema.safeParse({ locationId: "", collectionId: "c1" }).success).toBe(true);
    expect(shareSchema.safeParse({ locationId: "" }).success).toBe(false);
  });
});
