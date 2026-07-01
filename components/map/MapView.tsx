"use client";

import dynamic from "next/dynamic";
import { useSettingsStore } from "@/lib/store/settings";
import type { MapViewProps } from "@/lib/map/types";

const MapboxProvider = dynamic(() => import("./providers/MapboxProvider"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
const GoogleMapsProvider = dynamic(() => import("./providers/GoogleMapsProvider"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
const LeafletProvider = dynamic(() => import("./providers/LeafletProvider"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapView(props: MapViewProps) {
  const provider = useSettingsStore((s) => s.mapProvider);

  if (provider === "google") return <GoogleMapsProvider {...props} />;
  if (provider === "leaflet") return <LeafletProvider {...props} />;
  return <MapboxProvider {...props} />;
}

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading map…</div>
    </div>
  );
}
