import { MapPin } from "lucide-react";

interface Props {
  lat: number;
  lng: number;
}

export function AddLocationPin({ lat, lng }: Props) {
  return (
    <div className="flex flex-col items-center pointer-events-none animate-fade-in">
      <MapPin className="h-8 w-8 text-primary drop-shadow-lg" fill="currentColor" />
      <span className="text-xs bg-background border border-border rounded px-1.5 py-0.5 shadow font-mono mt-0.5">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </span>
    </div>
  );
}
