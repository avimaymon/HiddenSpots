"use client";

import { useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useMapStore } from "@/lib/store/map";
import type { MapViewProps } from "@/lib/map/types";
import { LocationPopup } from "@/components/map/shared/LocationPopup";
import { MapStyleSwitcher } from "@/components/map/shared/MapStyleSwitcher";
import { useSettingsStore } from "@/lib/store/settings";
import { useState } from "react";
import { cn } from "@/lib/utils";

const GOOGLE_MAP_IDS: Record<string, string> = {
  roadmap: "",
  satellite: "",
  hybrid: "",
  terrain: "",
};

export default function GoogleMapsProvider({
  locations,
  selectedId,
  onLocationClick,
  onMapClick,
  isAddingLocation,
  className,
}: MapViewProps) {
  const { viewState, setViewState } = useMapStore();
  const { mapStyle, setMapStyle } = useSettingsStore();
  const [hovered, setHovered] = useState<string | null>(null);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (isAddingLocation && onMapClick && e.detail.latLng) {
        const { lat, lng } = e.detail.latLng;
        onMapClick({ lat, lng });
      }
    },
    [isAddingLocation, onMapClick]
  );

  const hoveredLocation = locations.find((l) => l.id === hovered);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          center={{ lat: viewState.latitude, lng: viewState.longitude }}
          zoom={viewState.zoom}
          mapTypeId={(mapStyle as google.maps.MapTypeId) || "roadmap"}
          onClick={handleMapClick}
          onCameraChanged={(e) =>
            setViewState({
              latitude: e.detail.center.lat,
              longitude: e.detail.center.lng,
              zoom: e.detail.zoom,
            })
          }
          style={{ width: "100%", height: "100%" }}
          disableDefaultUI={false}
          gestureHandling="greedy"
          mapId="hiddenspots-map"
        >
          {locations.map((loc) => (
            <AdvancedMarker
              key={loc.id}
              position={{ lat: loc.latitude, lng: loc.longitude }}
              onClick={() => onLocationClick(loc.id)}
              onMouseEnter={() => setHovered(loc.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <Pin
                background={loc.categoryColor}
                borderColor={loc.id === selectedId ? "#fff" : loc.categoryColor}
                glyphColor="#fff"
                scale={loc.id === selectedId ? 1.3 : 1}
              />
            </AdvancedMarker>
          ))}

          {hoveredLocation && (
            <InfoWindow
              position={{ lat: hoveredLocation.latitude, lng: hoveredLocation.longitude }}
              onCloseClick={() => setHovered(null)}
            >
              <LocationPopup
                location={hoveredLocation}
                onClick={() => {
                  onLocationClick(hoveredLocation.id);
                  setHovered(null);
                }}
              />
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      <MapStyleSwitcher
        provider="google"
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          Click on the map to place your location
        </div>
      )}
    </div>
  );
}
