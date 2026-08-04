import { toPublicLocation } from "@/lib/shares/public-location";

type PrivacyLoc = Parameters<typeof toPublicLocation>[0];

type NestedLocRow = { location: PrivacyLoc | null };

/** Shape used only to drive privacy transforms; return type stays the caller's T. */
type SharePrivacyInput = {
  location?: PrivacyLoc | null;
  collection?: { locations: NestedLocRow[] } | null;
  trip?: { locations: NestedLocRow[] } | null;
};

/** Apply public DTO + SECRET fuzzing to nested share payloads (no `any`). */
export function applyPrivacy<T extends SharePrivacyInput>(share: T, token: string): T {
  if (share.location) {
    return {
      ...share,
      location: toPublicLocation(share.location, `${token}:${share.location.id ?? "loc"}`),
    } as T;
  }

  if (share.collection) {
    const updatedLocations = share.collection.locations.map((cl) => {
      const loc = cl.location;
      if (!loc) return cl;
      return {
        ...cl,
        location: toPublicLocation(loc, `${token}:${loc.id ?? "loc"}`),
      };
    });
    return {
      ...share,
      collection: { ...share.collection, locations: updatedLocations },
    } as T;
  }

  if (share.trip) {
    const updatedStops = share.trip.locations.map((stop) => {
      const loc = stop.location;
      if (!loc) return stop;
      return {
        ...stop,
        location: toPublicLocation(loc, `${token}:${loc.id ?? "loc"}`),
      };
    });
    return {
      ...share,
      trip: { ...share.trip, locations: updatedStops },
    } as T;
  }

  return share;
}
