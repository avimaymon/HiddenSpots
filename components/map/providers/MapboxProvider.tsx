"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl, FullscreenControl, Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import { circle as turfCircle } from "@turf/turf";
import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/lib/store/settings";
import { useMapStore } from "@/lib/store/map";
import type { MapViewProps } from "@/lib/map/types";
import { LocationPopup } from "@/components/map/shared/LocationPopup";
import { MapStyleSwitcher } from "@/components/map/shared/MapStyleSwitcher";
import { cn } from "@/lib/utils";

export default function MapboxProvider({
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
  showClusters = true,
  className,
  tripPolyline,
  showHeatmap,
  geojsonOverlay,
}: MapViewProps) {
  const t = useTranslations("map");
  const { mapStyle, setMapStyle } = useSettingsStore();
  const { viewState, setViewState } = useMapStore();
  const mapRef = useRef<MapRef>(null);
  const [popupLocation, setPopupLocation] = useState<(typeof locations)[0] | null>(null);
  const [terrain3D, setTerrain3D] = useState(false);
  const [showContours, setShowContours] = useState(false);

  const radiusGeojson = useMemo(() => {
    if (!radiusCenter || radiusKm == null || radiusKm <= 0) return null;
    return turfCircle([radiusCenter.lng, radiusCenter.lat], radiusKm, {
      steps: 64,
      units: "kilometers",
    });
  }, [radiusCenter, radiusKm]);

  const measureGeojson = useMemo((): GeoJSON.FeatureCollection | null => {
    if (measurePoints.length < 1) return null;
    const features: GeoJSON.Feature[] = measurePoints.map((p, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { i },
    }));
    if (measurePoints.length >= 2) {
      features.unshift({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: measurePoints.map((p) => [p.lng, p.lat]),
        },
        properties: {},
      });
    }
    return { type: "FeatureCollection", features };
  }, [measurePoints]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (terrain3D) {
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", { type: "raster-dem", url: "mapbox://mapbox.mapbox-terrain-dem-v1", tileSize: 512 });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
    } else {
      map.setTerrain(null);
    }
  }, [terrain3D]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;
    if (showContours) {
      if (!map.getSource("contours")) {
        map.addSource("contours", { type: "vector", url: "mapbox://mapbox.mapbox-terrain-v2" });
        map.addLayer({
          id: "contour-lines",
          type: "line",
          source: "contours",
          "source-layer": "contour",
          paint: { "line-color": "#6b7280", "line-opacity": 0.4, "line-width": 0.8 },
        });
      }
    } else if (map.getLayer("contour-lines")) {
      map.removeLayer("contour-lines");
    }
  }, [showContours]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (onMapClick && (isAddingLocation || measureMode)) {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      // Handle click on cluster or point via interactiveLayerIds
      const feature = e.features?.[0];
      if (!feature) return;

      if (feature.layer?.id === "cluster-circle") {
        // Zoom in on cluster click
        const map = mapRef.current?.getMap();
        if (!map) return;
        const source = map.getSource("locations") as mapboxgl.GeoJSONSource & {
          getClusterExpansionZoom: (id: number, cb: (err: Error | null, zoom: number) => void) => void;
        };
        const clusterId = feature.properties?.cluster_id as number;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoom ?? undefined });
        });
      } else if (feature.layer?.id === "unclustered-points") {
        const id = feature.properties?.id as string;
        if (id) {
          setPopupLocation(null);
          onLocationClick(id);
        }
      }
    },
    [isAddingLocation, measureMode, onMapClick, onLocationClick]
  );

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
        visitCount: loc.visitCount ?? 0,
      },
    })),
  };

  const heatmapGeojson = {
    type: "FeatureCollection" as const,
    features: locations.map((loc) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [loc.longitude, loc.latitude] },
      properties: { weight: Math.min((loc.visitCount ?? 1), 20) / 20 },
    })),
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onMoveEnd={(e) => {
          const b = e.target.getBounds();
          if (!b) return;
          onBoundsChange?.({
            west: b.getWest(),
            south: b.getSouth(),
            east: b.getEast(),
            north: b.getNorth(),
          });
        }}
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
        <NavigationControl position="top-right" showCompass={false} />
        <FullscreenControl position="top-right" />

        {/* Visit frequency heatmap */}
        {showHeatmap && (
          <Source id="heatmap-src" type="geojson" data={heatmapGeojson}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                "heatmap-weight": ["get", "weight"],
                "heatmap-intensity": 1.5,
                "heatmap-color": [
                  "interpolate", ["linear"], ["heatmap-density"],
                  0, "rgba(0,0,255,0)",
                  0.2, "rgba(0,255,255,0.5)",
                  0.4, "rgba(0,255,0,0.7)",
                  0.6, "rgba(255,255,0,0.8)",
                  0.8, "rgba(255,165,0,0.9)",
                  1, "rgba(255,0,0,1)",
                ],
                "heatmap-radius": 30,
                "heatmap-opacity": 0.7,
              }}
            />
          </Source>
        )}

        {/* Custom GeoJSON overlay */}
        {geojsonOverlay && (
          <Source id="geojson-overlay" type="geojson" data={geojsonOverlay}>
            <Layer
              id="geojson-overlay-line"
              type="line"
              paint={{ "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.8 }}
            />
            <Layer
              id="geojson-overlay-fill"
              type="fill"
              paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.1 }}
              filter={["==", ["geometry-type"], "Polygon"]}
            />
          </Source>
        )}

        {radiusGeojson && (
          <Source id="radius-circle" type="geojson" data={radiusGeojson}>
            <Layer
              id="radius-circle-fill"
              type="fill"
              paint={{ "fill-color": "#2563eb", "fill-opacity": 0.08 }}
            />
            <Layer
              id="radius-circle-line"
              type="line"
              paint={{ "line-color": "#2563eb", "line-width": 2 }}
            />
          </Source>
        )}

        {measureGeojson && (
          <Source id="measure-line" type="geojson" data={measureGeojson}>
            <Layer
              id="measure-line-layer"
              type="line"
              filter={["==", ["geometry-type"], "LineString"]}
              paint={{
                "line-color": "#f59e0b",
                "line-width": 3,
                "line-dasharray": [2, 1],
              }}
            />
            <Layer
              id="measure-points-layer"
              type="circle"
              filter={["==", ["geometry-type"], "Point"]}
              paint={{
                "circle-radius": 6,
                "circle-color": "#f59e0b",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        )}

        {/* Trip polyline */}
        {tripPolyline && tripPolyline.length >= 2 && (
          <Source
            id="trip-line"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: tripPolyline.map((p) => [p.lng, p.lat]),
              },
              properties: {},
            }}
          >
            <Layer
              id="trip-line-casing"
              type="line"
              paint={{
                "line-color": "#fff",
                "line-width": 6,
                "line-opacity": 0.7,
              }}
            />
            <Layer
              id="trip-line-fill"
              type="line"
              paint={{
                "line-color": tripPolyline[0].color,
                "line-width": 3.5,
                "line-dasharray": [2, 1.5],
              }}
            />
          </Source>
        )}

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

        {/* Hover tooltip — desktop only, augments click selection */}
        {popupLocation && !selectedId && (
          <Popup
            latitude={popupLocation.latitude}
            longitude={popupLocation.longitude}
            closeButton={false}
            anchor="bottom"
            offset={16}
            onClose={() => setPopupLocation(null)}
          >
            <LocationPopup
              location={popupLocation}
              onClick={() => { onLocationClick(popupLocation.id); setPopupLocation(null); }}
            />
          </Popup>
        )}
      </Map>

      <MapStyleSwitcher provider="mapbox" currentStyle={mapStyle} onStyleChange={setMapStyle} />

      <div className="absolute bottom-20 right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => setTerrain3D((v) => !v)}
          className={cn(
            "h-9 w-9 rounded-xl border border-border/60 bg-background/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-sm transition-colors",
            terrain3D ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
          )}
          title={t("terrain3d")}
        >
          ⛰️
        </button>
        <button
          onClick={() => setShowContours((v) => !v)}
          className={cn(
            "h-9 w-9 rounded-xl border border-border/60 bg-background/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-sm transition-colors",
            showContours ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
          )}
          title={t("contours")}
        >
          〰️
        </button>
      </div>

      {isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium shadow-lg animate-fade-in">
          {t("tapToPlace")}
        </div>
      )}
    </div>
  );
}
