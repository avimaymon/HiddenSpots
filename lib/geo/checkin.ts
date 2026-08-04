import { getDistanceBetween } from "@/lib/utils";

export type CheckinCandidate = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
};

export type CheckinPick =
  | { ok: true; location: CheckinCandidate; distanceM: number }
  | { ok: false; reason: "no_spots" | "too_far"; nearest?: CheckinCandidate; distanceM?: number };

/** Pick nearest spot within maxDistanceM for field check-in. */
export function pickCheckinTarget(
  locations: CheckinCandidate[],
  lat: number,
  lng: number,
  maxDistanceM = 200
): CheckinPick {
  if (!locations.length) return { ok: false, reason: "no_spots" };

  let nearest = locations[0];
  let bestM = getDistanceBetween(lat, lng, nearest.latitude, nearest.longitude);
  for (let i = 1; i < locations.length; i++) {
    const loc = locations[i];
    const m = getDistanceBetween(lat, lng, loc.latitude, loc.longitude);
    if (m < bestM) {
      bestM = m;
      nearest = loc;
    }
  }

  if (bestM > maxDistanceM) {
    return { ok: false, reason: "too_far", nearest, distanceM: bestM };
  }
  return { ok: true, location: nearest, distanceM: bestM };
}
