"use client";

interface Props {
  latitude: number;
  longitude: number;
  title?: string;
}

type MapApp = { label: string; emoji: string; url: (lat: number, lng: number, title: string) => string };

const APPS: MapApp[] = [
  {
    label: "Google Maps",
    emoji: "🗺️",
    url: (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`,
  },
  {
    label: "Waze",
    emoji: "🚗",
    url: (lat, lng) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  },
  {
    label: "Apple Maps",
    emoji: "🍎",
    url: (lat, lng, title) =>
      `https://maps.apple.com/?q=${encodeURIComponent(title)}&ll=${lat},${lng}`,
  },
  {
    label: "OsmAnd",
    emoji: "🧭",
    url: (lat, lng) => `geo:${lat},${lng}?q=${lat},${lng}`,
  },
];

export function ExternalMapsButtons({ latitude, longitude, title = "Spot" }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {APPS.map((app) => (
        <a
          key={app.label}
          href={app.url(latitude, longitude, title)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-medium"
        >
          <span>{app.emoji}</span>
          {app.label}
        </a>
      ))}
    </div>
  );
}
