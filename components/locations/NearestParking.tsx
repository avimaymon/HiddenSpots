"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Car } from "lucide-react";
import { formatDistance } from "@/lib/utils";

interface ParkingResult {
  name?: string;
  distance: number;
  lat: number;
  lon: number;
}

async function fetchNearestParking(lat: number, lon: number): Promise<ParkingResult | null> {
  try {
    // ponytail: Overpass API, free, no key needed. radius=500m
    const q = `[out:json][timeout:8];node["amenity"="parking"](around:500,${lat},${lon});out 5;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { elements: { lat: number; lon: number; tags?: { name?: string } }[] };
    const el = data.elements[0];
    if (!el) return null;
    const dLat = el.lat - lat;
    const dLon = el.lon - lon;
    const km = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
    return { name: el.tags?.name, distance: Math.round(km * 1000), lat: el.lat, lon: el.lon };
  } catch {
    return null;
  }
}

export function NearestParking({ latitude, longitude }: { latitude: number; longitude: number }) {
  const t = useTranslations("locations");
  const locale = useLocale();
  const [parking, setParking] = useState<ParkingResult | null | "loading">("loading");

  useEffect(() => {
    fetchNearestParking(latitude, longitude).then(setParking);
  }, [latitude, longitude]);

  if (parking === "loading" || !parking) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Car className="h-4 w-4 shrink-0 text-primary" />
      <span>
        {parking.name ? `${parking.name} ` : `${t("parkingFallback")} `}
        <span className="font-medium text-foreground">
          {t("parkingAway", { distance: formatDistance(parking.distance, locale) })}
        </span>
      </span>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lon}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary text-xs hover:underline"
      >
        {t("parkingDirections")}
      </a>
    </div>
  );
}
