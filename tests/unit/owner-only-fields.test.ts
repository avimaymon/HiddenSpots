import { describe, expect, it } from "vitest";
import {
  stripOwnerOnlyLocationFields,
  redactOwnerOnlyForRead,
} from "@/lib/permissions/owner-only-fields";

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

  it("deletes rather than blanks, so an update leaves the field alone", () => {
    // A `privateNotes: null` here would wipe the owner's notes. Absence is the
    // only thing Prisma reads as "do not change this".
    const next = stripOwnerOnlyLocationFields({
      title: "Trail",
      privateNotes: "secret stash",
    }) as Record<string, unknown>;
    expect("privateNotes" in next).toBe(false);
  });
});

/**
 * The read counterpart. getLocationById briefly used the *write* helper here,
 * which deleted keys from a row whose type still described them as present —
 * requiring a cast that promised callers a `number` where they would actually
 * have got `undefined`.
 */
describe("redactOwnerOnlyForRead", () => {
  const row = {
    id: "loc-1",
    title: "Hidden spring",
    privateNotes: "gate code 1234",
    privacy: "SECRET" as const,
    fuzzyCoordinates: true,
    fuzzyRadiusMeters: 500,
  };

  it("withholds the owner's private notes", () => {
    expect(redactOwnerOnlyForRead(row).privateNotes).toBeNull();
  });

  it("blanks rather than deletes, so the shape still matches its type", () => {
    const out = redactOwnerOnlyForRead(row) as Record<string, unknown>;
    expect("privateNotes" in out).toBe(true);
    expect(out.privateNotes).toBeNull();
  });

  it("keeps the fuzzing fields a collaborator needs to read the map honestly", () => {
    // Hiding these would let the map imply a precision the coordinates do not
    // have, which is worse than showing the spot is deliberately imprecise.
    const out = redactOwnerOnlyForRead(row);
    expect(out.privacy).toBe("SECRET");
    expect(out.fuzzyCoordinates).toBe(true);
    expect(out.fuzzyRadiusMeters).toBe(500);
  });

  it("does not mutate its input, and is idempotent", () => {
    const original = { ...row };
    const once = redactOwnerOnlyForRead(row);
    expect(row).toEqual(original);
    expect(redactOwnerOnlyForRead(once)).toEqual(once);
  });
});
