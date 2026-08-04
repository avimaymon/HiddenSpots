"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  type MapMouseEvent,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import { useLocale, useTranslations } from "next-intl";
import { useMapStore } from "@/lib/store/map";
import type { MapViewProps } from "@/lib/map/types";
import { LocationPopup } from "@/components/map/shared/LocationPopup";
import { MapStyleSwitcher } from "@/components/map/shared/MapStyleSwitcher";
import { useSettingsStore } from "@/lib/store/settings";
import { cn } from "@/lib/utils";
import { useMapClusters } from "@/hooks/use-map-clusters";

function TripPolylineOverlay({ points }: { points: { lat: number; lng: number; color: string }[] }) {
  const map = useMap();
  const polyRef = useRef<google.maps.Polyline | null>(null);
  useEffect(() => {
    if (!map || points.length < 2) return;
    polyRef.current?.setMap(null);
    polyRef.current = new google.maps.Polyline({
      path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: points[0]?.color ?? "#f59e0b",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });
    return () => { polyRef.current?.setMap(null); };
  }, [map, points]);
  return null;
}

function MeasureOverlay({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.Circle[]>([]);
  useEffect(() => {
    polyRef.current?.setMap(null);
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (!map || points.length < 1) return;
    if (points.length >= 2) {
      polyRef.current = new google.maps.Polyline({
        path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: "#f59e0b",
        strokeOpacity: 1,
        strokeWeight: 3,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
        map,
      });
    }
    markersRef.current = points.map(
      (p) =>
        new google.maps.Circle({
          center: { lat: p.lat, lng: p.lng },
          radius: 8,
          fillColor: "#f59e0b",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
          map,
          clickable: false,
        })
    );
    return () => {
      polyRef.current?.setMap(null);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, points]);
  return null;
}

function RadiusOverlay({
  center,
  radiusKm,
}: {
  center: { lat: number; lng: number } | null | undefined;
  radiusKm: number | null | undefined;
}) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);
  useEffect(() => {
    circleRef.current?.setMap(null);
    if (!map || !center || radiusKm == null || radiusKm <= 0) return;
    circleRef.current = new google.maps.Circle({
      center: { lat: center.lat, lng: center.lng },
      radius: radiusKm * 1000,
      fillColor: "#2563eb",
      fillOpacity: 0.08,
      strokeColor: "#2563eb",
      strokeWeight: 2,
      map,
      clickable: false,
    });
    return () => { circleRef.current?.setMap(null); };
  }, [map, center, radiusKm]);
  return null;
}

/** ponytail: visit-weight bubbles (Google lacks Mapbox heatmap layer). */
function HeatBubbles({
  locations,
  enabled,
}: {
  locations: MapViewProps["locations"];
  enabled?: boolean;
}) {
  const map = useMap();
  const circlesRef = useRef<google.maps.Circle[]>([]);
  useEffect(() => {
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    if (!map || !enabled) return;
    circlesRef.current = locations
      .map((loc) => {
        const w = Math.min(Math.max(loc.visitCount ?? (loc.isVisited ? 1 : 0), 0), 20);
        if (w <= 0) return null;
        return new google.maps.Circle({
          center: { lat: loc.latitude, lng: loc.longitude },
          radius: 80 + w * 40,
          fillColor: "#ea580c",
          fillOpacity: 0.12 + (w / 20) * 0.35,
          strokeWeight: 0,
          map,
          clickable: false,
        });
      })
      .filter((c): c is google.maps.Circle => c != null);
    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, locations, enabled]);
  return null;
}

export default function GoogleMapsProvider({
  locations,
  selectedId,
  onLocationClick,
  onMapClick,
  onBoundsChange,
  isAddingLocation,
  measureMode,
  measurePoints = [],
  radiusCenter,
  radiusKm,
  tripPolyline,
  showHeatmap,
  className,
}: MapViewProps) {
  const t = useTranslations("map");
  const locale = useLocale();
  const { viewState, setViewState } = useMapStore();
  const { mapStyle, setMapStyle } = useSettingsStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(viewState.zoom);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  const clusters = useMapClusters(locations, zoom, bounds);

  const handleCameraChanged = useCallback((e: MapCameraChangedEvent) => {
    const { center, zoom: z, bounds: b } = e.detail;
    setViewState({ latitude: center.lat, longitude: center.lng, zoom: z });
    setZoom(z);
    if (b) {
      setBounds([b.west, b.south, b.east, b.north]);
      onBoundsChange?.({ west: b.west, south: b.south, east: b.east, north: b.north });
    }
  }, [setViewState, onBoundsChange]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (onMapClick && (isAddingLocation || measureMode) && e.detail.latLng) {
        const { lat, lng } = e.detail.latLng;
        onMapClick({ lat, lng });
      }
    },
    [isAddingLocation, measureMode, onMapClick]
  );

  const hoveredLocation = locations.find((l) => l.id === hovered);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} language={locale}>
        <Map
          center={{ lat: viewState.latitude, lng: viewState.longitude }}
          zoom={viewState.zoom}
          mapTypeId={(mapStyle as google.maps.MapTypeId) || "roadmap"}
          onClick={handleMapClick}
          onCameraChanged={handleCameraChanged}
          style={{ width: "100%", height: "100%" }}
          disableDefaultUI={false}
          gestureHandling="greedy"
          mapId="hiddenspots-map"
        >
          {clusters.map((item) => {
            if (item.type === "cluster") {
              return (
                <AdvancedMarker
                  key={`cluster-${item.id}`}
                  position={{ lat: item.lat, lng: item.lng }}
                  onClick={() => {
                    setViewState({
                      latitude: item.lat,
                      longitude: item.lng,
                      zoom: item.expansionZoom,
                    });
                    setZoom(item.expansionZoom);
                  }}
                >
                  {/* Cluster bubble — matches Mapbox cluster style */}
                  <div
                    style={{
                      background: "#2563eb",
                      border: "3px solid #fff",
                      borderRadius: "50%",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: item.count > 99 ? 11 : 13,
                      width: item.count > 99 ? 42 : 36,
                      height: item.count > 99 ? 42 : 36,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                      cursor: "pointer",
                    }}
                  >
                    {item.count}
                  </div>
                </AdvancedMarker>
              );
            }

            const loc = item.location;
            return (
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
            );
          })}

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
          {tripPolyline && tripPolyline.length >= 2 && (
            <TripPolylineOverlay points={tripPolyline} />
          )}
          {measurePoints.length >= 1 && <MeasureOverlay points={measurePoints} />}
          <RadiusOverlay center={radiusCenter} radiusKm={radiusKm} />
          <HeatBubbles locations={locations} enabled={showHeatmap} />
        </Map>
      </APIProvider>

      <MapStyleSwitcher
        provider="google"
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          {t("tapToPlace")}
        </div>
      )}
    </div>
  );
}
