"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useRef, useState } from "react";
import Map, { NavigationControl, GeolocateControl, FullscreenControl, Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import { useSettingsStore } from "@/lib/store/settings";
import { useMapStore } from "@/lib/store/map";
import type { MapViewProps } from "@/lib/map/types";
import { LocationPopup } from "@/components/map/shared/LocationPopup";
import { MapStyleSwitcher } from "@/components/map/shared/MapStyleSwitcher";
import { AddLocationPin } from "@/components/map/shared/AddLocationPin";
import { cn } from "@/lib/utils";

export default function MapboxProvider({
  locations,
  selectedId,
  onLocationClick,
  onMapClick,
  isAddingLocation,
  showClusters = true,
  className,
}: MapViewProps) {
  const { mapStyle, setMapStyle } = useSettingsStore();
  const { viewState, setViewState } = useMapStore();
  const mapRef = useRef<MapRef>(null);
  const [popupLocation, setPopupLocation] = useState<(typeof locations)[0] | null>(null);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (isAddingLocation && onMapClick) {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    },
    [isAddingLocation, onMapClick]
  );

  const selectedLocation = locations.find((l) => l.id === selectedId);

  const geojson = {
    type: "FeatureCollection" as const,
    features: locations.map((loc) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [loc.longitude, loc.latitude] },
      properties: {
        id: loc.id,
        title: loc.title,
        color: loc.categoryColor,
        isSelected: loc.id === selectedId,
        isFavorite: loc.isFavorite,
      },
    })),
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={`mapbox://styles/mapbox/${mapStyle}`}
        cursor={isAddingLocation ? "crosshair" : "grab"}
        onClick={handleMapClick}
        interactiveLayerIds={["unclustered-points", "cluster-circle"]}
        onMouseEnter={(e) => {
          const feature = e.features?.[0];
          if (feature?.layer?.id === "unclustered-points") {
            const id = feature.properties?.id as string;
            const loc = locations.find((l) => l.id === id);
            if (loc) setPopupLocation(loc);
          }
        }}
        onMouseLeave={() => setPopupLocation(null)}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" trackUserLocation />
        <FullscreenControl position="top-right" />

        {showClusters ? (
          <Source
            id="locations"
            type="geojson"
            data={geojson}
            cluster
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            <Layer
              id="cluster-circle"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": ["step", ["get", "point_count"], "#22c55e", 10, "#f59e0b", 30, "#ef4444"],
                "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 30, 35],
                "circle-opacity": 0.85,
                "circle-stroke-width": 3,
                "circle-stroke-color": "#fff",
              }}
            />
            <Layer
              id="cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-size": 13,
              }}
              paint={{ "text-color": "#ffffff" }}
            />
            <Layer
              id="unclustered-points"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": ["case", ["==", ["get", "isSelected"], true], 14, 10],
                "circle-opacity": 0.9,
                "circle-stroke-width": ["case", ["==", ["get", "isSelected"], true], 3, 2],
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        ) : (
          locations.map((loc) => (
            <Marker
              key={loc.id}
              latitude={loc.latitude}
              longitude={loc.longitude}
              onClick={(e) => { e.originalEvent.stopPropagation(); onLocationClick(loc.id); }}
            >
              <div
                className={cn("map-marker", loc.id === selectedId && "selected")}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: loc.categoryColor,
                  border: "2.5px solid #fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              />
            </Marker>
          ))
        )}

        {popupLocation && (
          <Popup
            latitude={popupLocation.latitude}
            longitude={popupLocation.longitude}
            closeButton={false}
            anchor="bottom"
            offset={16}
          >
            <LocationPopup
              location={popupLocation}
              onClick={() => { onLocationClick(popupLocation.id); setPopupLocation(null); }}
            />
          </Popup>
        )}
      </Map>

      <MapStyleSwitcher provider="mapbox" currentStyle={mapStyle} onStyleChange={setMapStyle} />

      {isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          Click on the map to place your location
        </div>
      )}
    </div>
  );
}
