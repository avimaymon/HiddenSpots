import { getDistanceBetween } from "@/lib/utils";

export const DEFAULT_NEARBY_RADIUS_M = 25_000;

export type GeoPoint = { latitude: number; longitude: number };

/** Distance in meters from `origin`, or Infinity if origin missing. */
export function distanceFrom(
  origin: GeoPoint | null | undefined,
  lat: number,
  lng: number
): number {
  if (!origin) return Infinity;
  return getDistanceBetween(origin.latitude, origin.longitude, lat, lng);
}

export function filterWithinRadius<T extends GeoPoint>(
  items: T[],
  origin: GeoPoint,
  radiusM = DEFAULT_NEARBY_RADIUS_M
): T[] {
  return items.filter(
    (i) => getDistanceBetween(origin.latitude, origin.longitude, i.latitude, i.longitude) <= radiusM
  );
}

/** Ascending distance; items without coords sort last. */
export function sortByDistance<T extends GeoPoint>(
  items: T[],
  origin: GeoPoint
): T[] {
  return [...items].sort((a, b) => {
    const da = getDistanceBetween(origin.latitude, origin.longitude, a.latitude, a.longitude);
    const db = getDistanceBetween(origin.latitude, origin.longitude, b.latitude, b.longitude);
    return da - db;
  });
}

/** Walking ETA (~5 km/h) and driving ETA (~40 km/h rural). */
export function estimateEtaMinutes(meters: number, mode: "walk" | "drive" = "drive"): number {
  const kmh = mode === "walk" ? 5 : 40;
  return Math.max(1, Math.round((meters / 1000 / kmh) * 60));
}
