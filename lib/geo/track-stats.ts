/** Pure track stats for post-hike recap (client + tests). */

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function summarizeTrackPoints(
  points: { lat: number; lng: number; time?: number }[]
): { distanceKm: number; durationSec: number | null; pointCount: number } {
  let distanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1], points[i]);
  }
  const firstT = points[0]?.time;
  const lastT = points[points.length - 1]?.time;
  const durationSec =
    firstT != null && lastT != null && lastT >= firstT
      ? Math.round((lastT - firstT) / 1000)
      : null;
  return { distanceKm, durationSec, pointCount: points.length };
}

/** Min distance (km) from a point to any track vertex (sampled for large tracks). */
export function minDistanceKmToTrack(
  point: { lat: number; lng: number },
  track: { lat: number; lng: number }[],
  sampleEvery = 1
): number {
  if (!track.length) return Infinity;
  let min = Infinity;
  const step = Math.max(1, sampleEvery);
  for (let i = 0; i < track.length; i += step) {
    const d = haversineKm(point, track[i]);
    if (d < min) min = d;
  }
  // Always include last point
  const last = track[track.length - 1];
  min = Math.min(min, haversineKm(point, last));
  return min;
}

export type CorridorSpot = {
  id: string;
  title: string;
  isVisited: boolean;
  distanceKm: number;
};

/**
 * Atlas spots within `radiusKm` of the track polyline (vertex sampling).
 * Prefers unvisited; returns at most `limit`.
 */
export function spotsNearTrack<T extends { id: string; title: string; latitude: number; longitude: number; isVisited: boolean }>(
  spots: T[],
  track: { lat: number; lng: number }[],
  opts?: { radiusKm?: number; limit?: number }
): CorridorSpot[] {
  const radiusKm = opts?.radiusKm ?? 0.25;
  const limit = opts?.limit ?? 5;
  if (!track.length || !spots.length) return [];
  // Sample ~every Nth point so O(spots * track) stays cheap on long GPX.
  const sampleEvery = track.length > 400 ? Math.ceil(track.length / 200) : 1;
  const hits: CorridorSpot[] = [];
  for (const s of spots) {
    const distanceKm = minDistanceKmToTrack(
      { lat: s.latitude, lng: s.longitude },
      track,
      sampleEvery
    );
    if (distanceKm <= radiusKm) {
      hits.push({
        id: s.id,
        title: s.title,
        isVisited: s.isVisited,
        distanceKm,
      });
    }
  }
  hits.sort((a, b) => {
    if (a.isVisited !== b.isVisited) return a.isVisited ? 1 : -1;
    return a.distanceKm - b.distanceKm;
  });
  return hits.slice(0, limit);
}
