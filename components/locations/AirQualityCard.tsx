"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Wind } from "lucide-react";

type AqiBandKey = "good" | "moderate" | "sensitive" | "unhealthy" | "veryUnhealthy" | "hazardous";

interface AQData {
  aqi: number;
  band: AqiBandKey;
  color: string;
}

const AQI_BANDS: { max: number; band: AqiBandKey; color: string }[] = [
  { max: 50, band: "good", color: "#22c55e" },
  { max: 100, band: "moderate", color: "#f59e0b" },
  { max: 150, band: "sensitive", color: "#f97316" },
  { max: 200, band: "unhealthy", color: "#ef4444" },
  { max: 300, band: "veryUnhealthy", color: "#8b5cf6" },
  { max: Infinity, band: "hazardous", color: "#7f1d1d" },
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
    const band = AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
    return { aqi, band: band.band, color: band.color };
  } catch {
    return null;
  }
}

export function AirQualityCard({ latitude, longitude }: { latitude: number; longitude: number }) {
  const t = useTranslations("locations");
  const [data, setData] = useState<AQData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAQ(latitude, longitude).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [latitude, longitude]);

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Wind className="h-4 w-4 shrink-0" style={{ color: data.color }} />
      <div>
        <span className="font-medium" style={{ color: data.color }}>
          {t(`aqi.${data.band}`)}
        </span>
        <span className="text-muted-foreground ms-1.5">{t("aqiValue", { aqi: data.aqi })}</span>
      </div>
    </div>
  );
}
