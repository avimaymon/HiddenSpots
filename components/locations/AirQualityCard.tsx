"use client";

import { useEffect, useState } from "react";
import { Wind } from "lucide-react";

interface AQData {
  aqi: number;
  label: string;
  color: string;
}

const AQI_LABELS = [
  { max: 50, label: "Good", color: "#22c55e" },
  { max: 100, label: "Moderate", color: "#f59e0b" },
  { max: 150, label: "Unhealthy for Sensitive", color: "#f97316" },
  { max: 200, label: "Unhealthy", color: "#ef4444" },
  { max: 300, label: "Very Unhealthy", color: "#8b5cf6" },
  { max: Infinity, label: "Hazardous", color: "#7f1d1d" },
];

async function fetchAQ(lat: number, lng: number): Promise<AQData | null> {
  try {
    // ponytail: Open-Meteo air quality API, free, no key needed
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,pm10,pm2_5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { european_aqi?: number } };
    const aqi = data.current?.european_aqi;
    if (aqi == null) return null;
    const band = AQI_LABELS.find((b) => aqi <= b.max) ?? AQI_LABELS[AQI_LABELS.length - 1];
    return { aqi, label: band.label, color: band.color };
  } catch {
    return null;
  }
}

export function AirQualityCard({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [data, setData] = useState<AQData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAQ(latitude, longitude).then((d) => { setData(d); setLoading(false); });
  }, [latitude, longitude]);

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Wind className="h-4 w-4 shrink-0" style={{ color: data.color }} />
      <div>
        <span className="font-medium" style={{ color: data.color }}>{data.label}</span>
        <span className="text-muted-foreground ml-1.5">AQI {data.aqi}</span>
      </div>
    </div>
  );
}
