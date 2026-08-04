"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Activity, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { saveTrack } from "@/lib/actions/tracks";
import { enqueueSync } from "@/lib/offline/db";
import {
  spotsNearTrack,
  summarizeTrackPoints,
  type CorridorSpot,
} from "@/lib/geo/track-stats";
import { PostHikeRecap } from "@/components/map/shared/PostHikeRecap";

type AtlasSpot = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  isVisited: boolean;
};

interface Props {
  locationId?: string | null;
  atlasSpots?: AtlasSpot[];
  onTrackReady?: (gpx: string, points: { lat: number; lng: number }[]) => void;
  onOpenTracks?: () => void;
}

export function GpxRecorder({
  locationId,
  atlasSpots = [],
  onTrackReady,
  onOpenTracks,
}: Props) {
  const t = useTranslations("map");
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recap, setRecap] = useState<ReturnType<typeof summarizeTrackPoints> | null>(null);
  const [nearby, setNearby] = useState<CorridorSpot[]>([]);
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
    toast({ title: t("gpxStarted"), variant: "success" });
  }

  function openRecap(points: { lat: number; lng: number; time: number }[]) {
    setRecap(summarizeTrackPoints(points));
    setNearby(
      spotsNearTrack(atlasSpots, points, { radiusKm: 0.25, limit: 5 })
    );
  }

  async function stop() {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setRecording(false);
    const points = pointsRef.current;
    if (points.length < 2) {
      toast({ title: t("gpxTooFew"), variant: "destructive" });
      return;
    }

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HiddenSpots">
  <trk><name>HiddenSpots Track</name><trkseg>
${points.map((p) => `    <trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.time).toISOString()}</time></trkpt>`).join("\n")}
  </trkseg></trk>
</gpx>`;

    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `track-${Date.now()}.gpx`;
    a.click();
    URL.revokeObjectURL(url);

    onTrackReady?.(gpx, points.map((p) => ({ lat: p.lat, lng: p.lng })));

    setSaving(true);
    try {
      const payload = {
        name: t("gpxDefaultName"),
        locationId: locationId ?? null,
        points,
        gpx,
      };
      if (navigator.onLine) {
        await saveTrack(payload);
        toast({ title: t("gpxSaved", { count: points.length }), variant: "success" });
      } else {
        await enqueueSync("save-track", payload);
        toast({ title: t("gpxDownloadedOffline", { count: points.length }), variant: "success" });
      }
    } catch {
      toast({ title: t("gpxSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
      // Recap always — stats are local even if server save failed.
      openRecap(points);
    }
  }

  return (
    <>
      <Button
        variant={recording ? "destructive" : "ghost"}
        size="icon-sm"
        onClick={recording ? () => void stop() : start}
        disabled={saving}
        className="rounded-xl h-9 w-9"
        title={recording ? t("gpxStop") : t("gpxRecord")}
        aria-label={recording ? t("gpxStop") : t("gpxRecord")}
        aria-pressed={recording}
      >
        {recording ? <Square className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
      </Button>
      <PostHikeRecap
        open={recap != null}
        stats={recap}
        nearbySpots={nearby}
        onClose={() => {
          setRecap(null);
          setNearby([]);
        }}
        onOpenTracks={onOpenTracks}
      />
    </>
  );
}
