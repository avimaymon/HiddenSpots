/** Shared near-duplicate radius (meters) for import + create + settings scan. */
export const DUPE_RADIUS_METERS = 50;

/** Approximate planar distance in meters (good enough for ~50m near-dupe). */
export function approxDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * 111_320;
  const dLng = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}
