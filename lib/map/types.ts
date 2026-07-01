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
}

export interface MapViewProps {
  locations: MapLocation[];
  selectedId?: string | null;
  onLocationClick: (id: string) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  isAddingLocation?: boolean;
  showClusters?: boolean;
  activeCollectionIds?: string[];
  className?: string;
}

export const MAP_STYLES = {
  mapbox: [
    { id: "outdoors-v12", label: "Outdoors", icon: "🗺️" },
    { id: "streets-v12", label: "Streets", icon: "🏙️" },
    { id: "satellite-streets-v12", label: "Satellite", icon: "🛰️" },
    { id: "light-v11", label: "Light", icon: "☀️" },
    { id: "dark-v11", label: "Dark", icon: "🌙" },
  ],
  google: [
    { id: "roadmap", label: "Roadmap", icon: "🗺️" },
    { id: "satellite", label: "Satellite", icon: "🛰️" },
    { id: "hybrid", label: "Hybrid", icon: "🌐" },
    { id: "terrain", label: "Terrain", icon: "⛰️" },
  ],
  leaflet: [
    { id: "osm", label: "OpenStreetMap", icon: "🗺️" },
    { id: "topo", label: "Topographic", icon: "⛰️" },
    { id: "satellite", label: "Satellite", icon: "🛰️" },
  ],
} as const;

export const LEAFLET_TILE_URLS: Record<string, string> = {
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};
