export type MapProvider = "mapbox" | "google" | "leaflet";

export interface MapLocation {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  categoryColor: string;
  categoryIcon: string;
  isFavorite: boolean;
  isVisited: boolean;
  coverPhotoUrl?: string | null;
  visitCount?: number;
}

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export interface MapViewProps {
  locations: MapLocation[];
  selectedId?: string | null;
  onLocationClick: (id: string) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  /** Real provider viewport bounds (prefer over heuristic bboxFromViewState). */
  onBoundsChange?: (bounds: MapBounds) => void;
  isAddingLocation?: boolean;
  measureMode?: boolean;
  measurePoints?: { lat: number; lng: number }[];
  radiusCenter?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  showClusters?: boolean;
  activeCollectionIds?: string[];
  className?: string;
  /** Ordered waypoints for trip polyline */
  tripPolyline?: { lat: number; lng: number; color: string }[];
  /** Show visit-frequency heatmap overlay */
  showHeatmap?: boolean;
  /** Custom GeoJSON overlay (trails, boundaries, etc.) */
  geojsonOverlay?: GeoJSON.FeatureCollection | null;
}

/** labelKey maps to messages map.styles.* */
export const MAP_STYLES = {
  mapbox: [
    { id: "outdoors-v12", labelKey: "outdoors", icon: "🗺️" },
    { id: "streets-v12", labelKey: "streets", icon: "🏙️" },
    { id: "satellite-streets-v12", labelKey: "satellite", icon: "🛰️" },
    { id: "light-v11", labelKey: "light", icon: "☀️" },
    { id: "dark-v11", labelKey: "dark", icon: "🌙" },
  ],
  google: [
    { id: "roadmap", labelKey: "roadmap", icon: "🗺️" },
    { id: "satellite", labelKey: "satellite", icon: "🛰️" },
    { id: "hybrid", labelKey: "hybrid", icon: "🌐" },
    { id: "terrain", labelKey: "terrain", icon: "⛰️" },
  ],
  leaflet: [
    { id: "osm", labelKey: "osm", icon: "🗺️" },
    { id: "topo", labelKey: "topo", icon: "⛰️" },
    { id: "satellite", labelKey: "satellite", icon: "🛰️" },
  ],
} as const;

export const LEAFLET_TILE_URLS: Record<string, string> = {
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};
