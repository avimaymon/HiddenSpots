import { useMemo } from "react";
import Supercluster from "supercluster";
import type { MapLocation } from "@/lib/map/types";

export interface ClusterFeature {
  type: "cluster";
  id: number;
  lat: number;
  lng: number;
  count: number;
  /** Zoom level at which this cluster expands. */
  expansionZoom: number;
}

export interface PointFeature {
  type: "point";
  id: string;
  lat: number;
  lng: number;
  location: MapLocation;
}

export type ClusterItem = ClusterFeature | PointFeature;

/**
 * Client-side marker clustering using supercluster.
 *
 * ponytail: recomputes on zoom/bounds change; Supercluster is ~10ms for 10k points.
 * Ceiling: O(n log n) index build; swap for tiled clustering if locations > 100k.
 */
export function useMapClusters(
  locations: MapLocation[],
  zoom: number,
  bounds: [number, number, number, number] | null, // [west, south, east, north]
  radius = 60
): ClusterItem[] {
  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string; location: MapLocation }>({ radius, maxZoom: 20 });
    sc.load(
      locations.map((loc) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
        properties: { id: loc.id, location: loc },
      }))
    );
    return sc;
  }, [locations, radius]);

  return useMemo(() => {
    if (!bounds) return [];

    const raw = index.getClusters(bounds, Math.round(zoom));
    return raw.map((f): ClusterItem => {
      const props = f.properties as {
        cluster?: boolean;
        cluster_id?: number;
        point_count?: number;
        id?: string;
        location?: MapLocation;
      };

      if (props.cluster && props.cluster_id !== undefined) {
        return {
          type: "cluster",
          id: props.cluster_id,
          lat: (f.geometry as GeoJSON.Point).coordinates[1],
          lng: (f.geometry as GeoJSON.Point).coordinates[0],
          count: props.point_count ?? 0,
          expansionZoom: index.getClusterExpansionZoom(props.cluster_id),
        };
      }

      return {
        type: "point",
        id: props.id!,
        lat: (f.geometry as GeoJSON.Point).coordinates[1],
        lng: (f.geometry as GeoJSON.Point).coordinates[0],
        location: props.location!,
      };
    });
  }, [index, bounds, zoom]);
}
