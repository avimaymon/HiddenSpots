"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Navigation, MapPin } from "lucide-react";
import * as turf from "@turf/turf";

interface Props {
  locations: { id: string; title: string; latitude: number; longitude: number }[];
}

export function NearbyNowCard({ locations }: Props) {
  const [nearest, setNearest] = useState<{ id: string; title: string; distanceKm: number } | null>(null);

  useEffect(() => {
    if (!locations.length) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const from = turf.point([pos.coords.longitude, pos.coords.latitude]);
        let minD = Infinity;
        let best = locations[0];
        for (const loc of locations) {
          const d = turf.distance(from, turf.point([loc.longitude, loc.latitude]));
          if (d < minD) { minD = d; best = loc; }
        }
        setNearest({ id: best.id, title: best.title, distanceKm: Math.round(minD * 10) / 10 });
      },
      () => {},
      { maximumAge: 60000, timeout: 5000 }
    );
  }, [locations]);

  if (!nearest) return null;

  return (
    <Link
      href={`/locations/${nearest.id}`}
      className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
    >
      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Navigation className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">Nearby now</p>
        <p className="text-sm font-bold truncate">{nearest.title}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-primary">{nearest.distanceKm} km</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <MapPin className="h-2.5 w-2.5" /> away
        </p>
      </div>
    </Link>
  );
}
