"use client";

import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Marker,
  Polyline,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";
import { useMapStore } from "@/lib/store/map";
import { useSettingsStore } from "@/lib/store/settings";
import type { MapViewProps } from "@/lib/map/types";
import { MapStyleSwitcher } from "@/components/map/shared/MapStyleSwitcher";
import { LEAFLET_TILE_URLS } from "@/lib/map/types";
import { cn } from "@/lib/utils";
import { useMapClusters } from "@/hooks/use-map-clusters";
import "leaflet/dist/leaflet.css";

/** Fires click + reports zoom/bounds to parent state. */
function MapEventHandler({
  clickEnabled,
  onMapClick,
  onViewChange,
}: {
  clickEnabled?: boolean;
  onMapClick?: (c: { lat: number; lng: number }) => void;
  onViewChange: (zoom: number, bounds: [number, number, number, number]) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (clickEnabled && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
    moveend() {
      const b = map.getBounds();
      onViewChange(map.getZoom(), [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    },
    zoomend() {
      const b = map.getBounds();
      onViewChange(map.getZoom(), [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    },
  });
  return null;
}

/** DivIcon factory for cluster bubbles — created lazily to avoid SSR issues. */
function clusterIcon(count: number): L.DivIcon {
  const size = count > 99 ? 42 : 36;
  return L.divIcon({
    html: `<div style="
      background:#2563eb;border:3px solid #fff;border-radius:50%;
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${count > 99 ? 11 : 13}px;
      width:${size}px;height:${size}px;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;
    ">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function LeafletProvider({
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
  const { viewState, setViewState } = useMapStore();
  const { mapStyle, setMapStyle } = useSettingsStore();
  const tileUrl = LEAFLET_TILE_URLS[mapStyle] ?? LEAFLET_TILE_URLS.osm;

  const [zoom, setZoom] = useState(viewState.zoom);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  const clusters = useMapClusters(locations, zoom, bounds);
  const clickEnabled = Boolean(isAddingLocation || measureMode);

  function handleViewChange(z: number, b: [number, number, number, number]) {
    setZoom(z);
    setBounds(b);
    setViewState({ ...viewState, zoom: z });
    onBoundsChange?.({ west: b[0], south: b[1], east: b[2], north: b[3] });
  }

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
        <MapEventHandler
          clickEnabled={clickEnabled}
          onMapClick={onMapClick}
          onViewChange={handleViewChange}
        />

        {radiusCenter && radiusKm != null && radiusKm > 0 && (
          <Circle
            center={[radiusCenter.lat, radiusCenter.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.08, weight: 2 }}
          />
        )}

        {measurePoints.length >= 2 && (
          <Polyline
            positions={measurePoints.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#f59e0b", weight: 3, dashArray: "6 6" }}
          />
        )}
        {measurePoints.map((p, i) => (
          <CircleMarker
            key={`measure-${i}`}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: "#fff", fillColor: "#f59e0b", fillOpacity: 1, weight: 2 }}
          />
        ))}

        {tripPolyline && tripPolyline.length >= 2 && (
          <Polyline
            positions={tripPolyline.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: tripPolyline[0]?.color ?? "#f59e0b",
              weight: 4,
              opacity: 0.9,
              className: "trip-trail-draw",
            }}
          />
        )}

        {/* ponytail: density bubbles — Mapbox has native heatmap; upgrade to heat plugin if needed */}
        {showHeatmap &&
          locations.map((loc) => {
            const w = Math.min(Math.max(loc.visitCount ?? (loc.isVisited ? 1 : 0), 0), 20);
            if (w <= 0) return null;
            return (
              <CircleMarker
                key={`heat-${loc.id}`}
                center={[loc.latitude, loc.longitude]}
                radius={10 + w * 2.5}
                pathOptions={{
                  color: "transparent",
                  fillColor: "#ea580c",
                  fillOpacity: 0.12 + (w / 20) * 0.4,
                  weight: 0,
                }}
              />
            );
          })}

        {clusters.map((item) => {
          if (item.type === "cluster") {
            return (
              <Marker
                key={`cluster-${item.id}`}
                position={[item.lat, item.lng]}
                icon={clusterIcon(item.count)}
                eventHandlers={{
                  click() {
                    setViewState({
                      latitude: item.lat,
                      longitude: item.lng,
                      zoom: item.expansionZoom,
                    });
                    setZoom(item.expansionZoom);
                  },
                }}
              />
            );
          }

          const loc = item.location;
          const selected = loc.id === selectedId;
          return (
            <CircleMarker
              key={loc.id}
              center={[loc.latitude, loc.longitude]}
              radius={selected ? 13 : 9}
              pathOptions={{
                color: "#fff",
                fillColor: loc.categoryColor,
                fillOpacity: 0.95,
                weight: selected ? 3 : 2,
                className: selected ? "marker-breathe" : undefined,
              }}
              eventHandlers={{ click: () => onLocationClick(loc.id) }}
            >
              <Tooltip permanent={false} direction="top" offset={[0, -10]}>
                {loc.title}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <MapStyleSwitcher
        provider="leaflet"
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          {t("tapToPlace")}
        </div>
      )}
      {measureMode && !isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          {t("clickToMeasure")}
        </div>
      )}
    </div>
  );
}
