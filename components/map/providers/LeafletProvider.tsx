"use client";

import { useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import { useMapStore } from "@/lib/store/map";
import { useSettingsStore } from "@/lib/store/settings";
import type { MapViewProps } from "@/lib/map/types";
import { MapStyleSwitcher } from "@/components/map/shared/MapStyleSwitcher";
import { LEAFLET_TILE_URLS } from "@/lib/map/types";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

function ClickHandler({ isAdding, onMapClick }: { isAdding?: boolean; onMapClick?: (c: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      if (isAdding && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function LeafletProvider({
  locations,
  selectedId,
  onLocationClick,
  onMapClick,
  isAddingLocation,
  className,
}: MapViewProps) {
  const { viewState } = useMapStore();
  const { mapStyle, setMapStyle } = useSettingsStore();
  const tileUrl = LEAFLET_TILE_URLS[mapStyle] ?? LEAFLET_TILE_URLS.osm;

  return (
    <div className={cn("relative w-full h-full", className)}>
      <MapContainer
        center={[viewState.latitude, viewState.longitude]}
        zoom={viewState.zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler isAdding={isAddingLocation} onMapClick={onMapClick} />
        {locations.map((loc) => (
          <CircleMarker
            key={loc.id}
            center={[loc.latitude, loc.longitude]}
            radius={loc.id === selectedId ? 12 : 9}
            pathOptions={{
              color: "#fff",
              fillColor: loc.categoryColor,
              fillOpacity: 0.9,
              weight: loc.id === selectedId ? 3 : 2,
            }}
            eventHandlers={{ click: () => onLocationClick(loc.id) }}
          >
            <Tooltip permanent={false} direction="top" offset={[0, -10]}>
              {loc.title}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <MapStyleSwitcher
        provider="leaflet"
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          Click on the map to place your location
        </div>
      )}
    </div>
  );
}
