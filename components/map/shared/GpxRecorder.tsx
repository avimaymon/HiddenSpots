"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  onTrackReady?: (gpx: string, points: { lat: number; lng: number }[]) => void;
}

export function GpxRecorder({ onTrackReady }: Props) {
  const [recording, setRecording] = useState(false);
  const pointsRef = useRef<{ lat: number; lng: number; time: number }[]>([]);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  function start() {
    pointsRef.current = [];
    setRecording(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        pointsRef.current.push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          time: pos.timestamp,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
    toast({ title: "GPX recording started", variant: "success" });
  }

  function stop() {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setRecording(false);
    const points = pointsRef.current;
    if (points.length < 2) { toast({ title: "Not enough points recorded", variant: "destructive" }); return; }

    // Build GPX string
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HiddenSpots">
  <trk><name>HiddenSpots Track</name><trkseg>
${points.map((p) => `    <trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.time).toISOString()}</time></trkpt>`).join("\n")}
  </trkseg></trk>
</gpx>`;

    // Download
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `track-${Date.now()}.gpx`;
    a.click();
    URL.revokeObjectURL(url);

    onTrackReady?.(gpx, points.map((p) => ({ lat: p.lat, lng: p.lng })));
    toast({ title: `Track saved: ${points.length} points`, variant: "success" });
  }

  return (
    <Button
      variant={recording ? "destructive" : "ghost"}
      size="icon-sm"
      onClick={recording ? stop : start}
      className="rounded-xl h-9 w-9"
      title={recording ? "Stop recording GPX" : "Record GPX track"}
    >
      {recording ? <Square className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
    </Button>
  );
}
