export interface LocationCoords {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string | null;
}

export type NavApp = "waze" | "google-maps" | "google-directions" | "apple-maps" | "osm";

export interface NavLink {
  id: NavApp;
  name: string;
  description: string;
  url: string;
  color: string;
  /** Show on mobile / Israel-first apps */
  featured?: boolean;
}

function fmt(lat: number, lng: number) {
  return `${lat},${lng}`;
}

export function buildWazeNavigate({ latitude, longitude }: LocationCoords) {
  return `https://www.waze.com/ul?ll=${fmt(latitude, longitude)}&navigate=yes`;
}

export function buildWazeView({ latitude, longitude }: LocationCoords) {
  return `https://www.waze.com/ul?ll=${fmt(latitude, longitude)}&zoom=17`;
}

export function buildGoogleMapsView({ latitude, longitude, title }: LocationCoords) {
  const q = title
    ? encodeURIComponent(`${title}@${latitude},${longitude}`)
    : fmt(latitude, longitude);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function buildGoogleMapsDirections({ latitude, longitude }: LocationCoords) {
  return `https://www.google.com/maps/dir/?api=1&destination=${fmt(latitude, longitude)}`;
}

export function buildAppleMapsNavigate({ latitude, longitude, title }: LocationCoords) {
  const params = new URLSearchParams({
    daddr: fmt(latitude, longitude),
    dirflg: "d",
  });
  if (title) params.set("q", title);
  return `https://maps.apple.com/?${params}`;
}

export function buildAppleMapsView({ latitude, longitude, title }: LocationCoords) {
  const params = new URLSearchParams({ ll: fmt(latitude, longitude) });
  if (title) params.set("q", title);
  return `https://maps.apple.com/?${params}`;
}

export function buildOpenStreetMap({ latitude, longitude }: LocationCoords) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

export function buildMoovit({ latitude, longitude, title }: LocationCoords) {
  const dest = title ? encodeURIComponent(title) : fmt(latitude, longitude);
  return `https://moovit.com/?to=${dest}&lat=${latitude}&lon=${longitude}`;
}

export function getNavigationLinks(location: LocationCoords): NavLink[] {
  return [
    {
      id: "waze",
      name: "Waze",
      description: "Navigate with Waze",
      url: buildWazeNavigate(location),
      color: "#33CCFF",
      featured: true,
    },
    {
      id: "google-directions",
      name: "Google Maps",
      description: "Driving directions",
      url: buildGoogleMapsDirections(location),
      color: "#4285F4",
      featured: true,
    },
    {
      id: "google-maps",
      name: "Google Maps",
      description: "View on map",
      url: buildGoogleMapsView(location),
      color: "#34A853",
    },
    {
      id: "apple-maps",
      name: "Apple Maps",
      description: "Open in Apple Maps",
      url: buildAppleMapsNavigate(location),
      color: "#555555",
    },
    {
      id: "osm",
      name: "OpenStreetMap",
      description: "View on OSM",
      url: buildOpenStreetMap(location),
      color: "#7EBC6F",
    },
  ];
}

export function getShareText(location: LocationCoords) {
  const name = location.title ?? "Hidden Spot";
  const coords = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  const maps = buildGoogleMapsView(location);
  const waze = buildWazeNavigate(location);
  return `${name}\n📍 ${coords}${location.address ? `\n${location.address}` : ""}\n\nGoogle Maps: ${maps}\nWaze: ${waze}`;
}

export function buildWhatsAppShare(location: LocationCoords) {
  return `https://wa.me/?text=${encodeURIComponent(getShareText(location))}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

export function buildGpxWaypoint({ latitude, longitude, title }: LocationCoords): string {
  const name = (title ?? "Hidden Spot").replace(/[<>&"']/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HiddenSpots">
  <wpt lat="${latitude}" lon="${longitude}">
    <name>${name}</name>
  </wpt>
</gpx>`;
}

export async function nativeShare(location: LocationCoords): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share({
      title: location.title ?? "Hidden Spot",
      text: getShareText(location),
      url: buildGoogleMapsView(location),
    });
    return true;
  } catch (e) {
    if ((e as Error).name === "AbortError") return true;
    return false;
  }
}
