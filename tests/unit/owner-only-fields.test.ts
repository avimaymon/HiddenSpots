import { describe, expect, it } from "vitest";
import { stripOwnerOnlyLocationFields } from "@/lib/permissions/owner-only-fields";

describe("stripOwnerOnlyLocationFields", () => {
  it("removes private notes and privacy knobs", () => {
    const next = stripOwnerOnlyLocationFields({
      title: "Trail",
      privateNotes: "secret stash",
      privacy: "SECRET",
      fuzzyCoordinates: true,
      fuzzyRadiusMeters: 900,
      tips: "bring water",
    });
    expect(next).toEqual({ title: "Trail", tips: "bring water" });
    expect("privateNotes" in next).toBe(false);
  });
});
