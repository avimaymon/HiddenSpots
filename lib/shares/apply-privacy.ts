import { toPublicLocation } from "@/lib/shares/public-location";
import type { FuzzSeedDeriver } from "@/lib/shares/fuzz-seed";

type PrivacyLoc = Parameters<typeof toPublicLocation>[0];

type NestedLocRow = { location: PrivacyLoc | null };

/** Shape used only to drive privacy transforms; return type stays the caller's T. */
type SharePrivacyInput = {
  location?: PrivacyLoc | null;
  collection?: { locations: NestedLocRow[] } | null;
  trip?: { locations: NestedLocRow[] } | null;
};

/**
 * Apply public DTO + SECRET fuzzing to nested share payloads (no `any`).
 *
 * Every populated branch is transformed. An early return per branch would leave
 * the others as raw Prisma rows — privateNotes and true SECRET coordinates
 * included — for any share row carrying more than one resource. `shareSchema`
 * now rejects those at creation, but legacy rows may already exist.
 *
 * `deriveSeed` is injected rather than imported here so this module stays pure
 * and unit-testable, and so the HMAC key is never reachable from a module a
 * client component might transitively import.
 */
export function applyPrivacy<T extends SharePrivacyInput>(
  share: T,
  token: string,
  deriveSeed: FuzzSeedDeriver
): T {
  // Thunk: only spots that actually get fuzzed pay for the HMAC, and a share
  // containing no SECRET spots never touches AUTH_SECRET at all.
  const toPublic = (loc: PrivacyLoc) =>
    toPublicLocation(loc, () => deriveSeed(token, loc.id ?? "loc"));

  const mapRow = <R extends NestedLocRow>(row: R): R =>
    row.location ? { ...row, location: toPublic(row.location) } : row;

  let out = share;

  if (out.location) {
    out = { ...out, location: toPublic(out.location) };
  }
  if (out.collection) {
    out = {
      ...out,
      collection: { ...out.collection, locations: out.collection.locations.map(mapRow) },
    };
  }
  if (out.trip) {
    out = {
      ...out,
      trip: { ...out.trip, locations: out.trip.locations.map(mapRow) },
    };
  }

  return out;
}
