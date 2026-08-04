/** Fallback bbox from center + zoom when provider has not reported getBounds yet. */
export function bboxFromViewState(view: {
  latitude: number;
  longitude: number;
  zoom: number;
}): { west: number; south: number; east: number; north: number } {
  const zoom = Math.max(1, Math.min(22, view.zoom));
  const latDelta = 180 / 2 ** zoom;
  const cos = Math.max(0.05, Math.cos((view.latitude * Math.PI) / 180));
  const lngDelta = 360 / 2 ** zoom / cos;
  return {
    west: view.longitude - lngDelta,
    east: view.longitude + lngDelta,
    south: view.latitude - latDelta / 2,
    north: view.latitude + latDelta / 2,
  };
}
