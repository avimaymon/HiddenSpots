"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Navigation, Check, ChevronRight, X, Loader2, MapPin, Phone, Compass, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getDistanceBetween, formatDistance, formatDuration } from "@/lib/utils";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useCompass } from "@/hooks/use-compass";
import { createVisit } from "@/lib/actions/visits";
import { toast } from "@/hooks/use-toast";
import { buildWazeNavigate } from "@/lib/navigation/external-links";
import { bearing as turfBearing } from "@turf/turf";
import { estimateEtaMinutes } from "@/lib/geo/nearby";

const AUTO_ARRIVE_M = 80;

interface Stop {
  id: string;
  locationId: string;
  sortOrder: number;
  location: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    category: { color: string } | null;
  } | null;
}

interface Props {
  trip: { id: string; name: string; color: string; emergencyContact?: string | null; emergencyPhone?: string | null };
  stops: Stop[];
  onClose: () => void;
}

export function TripGoMode({ trip, stops, onClose }: Props) {
  const t = useTranslations("trips");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [logging, setLogging] = useState(false);
  const [online, setOnline] = useState(true);
  const autoArrivedRef = useRef<Set<string>>(new Set());
  const { latitude, longitude, startWatch, stopWatch, denied, loading } = useGeolocation(true);
  const compassHeading = useCompass();

  useEffect(() => {
    startWatch();
    return stopWatch;
  }, [startWatch, stopWatch]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const ordered = [...stops]
    .filter((s) => s.location)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const current = ordered[currentIdx];
  const completed = currentIdx >= ordered.length;

  const metersToNext =
    current?.location && latitude != null && longitude != null
      ? getDistanceBetween(latitude, longitude, current.location.latitude, current.location.longitude)
      : null;

  const distanceToNext = metersToNext != null ? formatDistance(metersToNext) : null;
  const etaDrive = metersToNext != null ? estimateEtaMinutes(metersToNext, "drive") : null;
  const etaWalk = metersToNext != null ? estimateEtaMinutes(metersToNext, "walk") : null;

  const bearingToNext =
    current?.location && latitude != null && longitude != null
      ? turfBearing([longitude, latitude], [current.location.longitude, current.location.latitude])
      : null;
  const relBearing =
    bearingToNext != null && compassHeading != null
      ? ((bearingToNext - compassHeading + 360) % 360)
      : bearingToNext;

  async function markArrived(auto = false) {
    if (!current || logging) return;
    const locId = current.location!.id;
    if (auto && autoArrivedRef.current.has(locId)) return;
    setLogging(true);
    try {
      await createVisit({ locationId: locId, visitedAt: new Date().toISOString() });
      if (auto) autoArrivedRef.current.add(locId);
      setVisited((v) => new Set([...v, locId]));
      toast({
        title: auto ? t("goMode.autoArrived") : t("goMode.stopVisited"),
        variant: "success",
      });
      if (currentIdx + 1 < ordered.length) {
        setCurrentIdx((i) => i + 1);
      } else {
        setCurrentIdx(ordered.length);
        toast({ title: t("goMode.completed"), variant: "success" });
      }
    } finally {
      setLogging(false);
    }
  }

  // Auto-advance when within AUTO_ARRIVE_M
  useEffect(() => {
    if (metersToNext == null || metersToNext > AUTO_ARRIVE_M || !current?.location) return;
    if (visited.has(current.location.id) || logging) return;
    void markArrived(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metersToNext, current?.location?.id]);

  function navigateTo() {
    if (!current?.location) return;
    const url = buildWazeNavigate({
      latitude: current.location.latitude,
      longitude: current.location.longitude,
      title: current.location.title,
    });
    window.open(url, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm flex flex-col">
      <div
        className="flex items-center gap-2 px-4 py-4 border-b border-border/50"
        style={{ borderBottomColor: `${trip.color}40` }}
      >
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${trip.color}20`, color: trip.color }}
        >
          <Navigation className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{trip.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("goMode.title")} · {currentIdx}/{ordered.length}
          </p>
        </div>
        {!online && (
          <span className="flex items-center gap-1 text-[11px] text-amber-600 shrink-0">
            <WifiOff className="h-3.5 w-3.5" /> {t("goMode.offline")}
          </span>
        )}
        {trip.emergencyPhone && latitude != null && (
          <a
            href={`sms:${trip.emergencyPhone}?body=${encodeURIComponent(`I'm on trip "${trip.name}" at ${latitude?.toFixed(5)},${longitude?.toFixed(5)} — checking in.`)}`}
            className="h-9 px-3 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title="Share my location"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-xl shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
        {ordered.map((stop, i) => (
          <div
            key={stop.id}
            className={cn(
              "h-2 rounded-full shrink-0 transition-all",
              i < currentIdx ? "w-2" : i === currentIdx ? "w-8" : "w-2",
              visited.has(stop.location?.id ?? "") || i < currentIdx
                ? "opacity-100"
                : "opacity-30"
            )}
            style={{ background: trip.color }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {completed ? (
          <div className="text-center space-y-4">
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-5xl mx-auto">
              ✓
            </div>
            <p className="font-bold text-xl">{t("goMode.completed")}</p>
            <p className="text-sm text-muted-foreground">
              {ordered.length} {t("stops")}
            </p>
            <Button className="rounded-xl" onClick={onClose}>
              {t("goMode.title")}
            </Button>
          </div>
        ) : current ? (
          <div className="w-full max-w-sm space-y-4">
            <div
              className="rounded-3xl border-2 p-5 space-y-3"
              style={{ borderColor: `${trip.color}50` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${trip.color}20`, color: trip.color }}
                >
                  {currentIdx + 1}
                </div>
                <p className="font-bold text-base">{current.location!.title}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono text-xs">
                  {current.location!.latitude.toFixed(5)}, {current.location!.longitude.toFixed(5)}
                </span>
              </div>
              {distanceToNext && (
                <div
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-sm"
                  style={{ color: trip.color }}
                >
                  <span className="flex items-center gap-1.5">
                    <Navigation className="h-4 w-4" />
                    {distanceToNext}
                  </span>
                  {etaDrive != null && (
                    <span className="font-medium text-muted-foreground">
                      {t("goMode.etaDrive", { time: formatDuration(etaDrive) })}
                    </span>
                  )}
                  {etaWalk != null && metersToNext != null && metersToNext < 5000 && (
                    <span className="font-medium text-muted-foreground">
                      {t("goMode.etaWalk", { time: formatDuration(etaWalk) })}
                    </span>
                  )}
                </div>
              )}
              {relBearing != null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Compass
                    className="h-5 w-5 text-primary transition-transform"
                    style={{ transform: `rotate(${relBearing}deg)` }}
                  />
                  <span>{Math.round(relBearing)}°</span>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  …
                </div>
              )}
              {denied && (
                <p className="text-xs text-amber-600">{t("goMode.gpsDenied")}</p>
              )}
              {metersToNext != null && metersToNext <= AUTO_ARRIVE_M && (
                <p className="text-xs text-emerald-600 font-medium">{t("goMode.nearAuto")}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={navigateTo}
                disabled={!online}
              >
                <Navigation className="h-4 w-4" />
                {t("goMode.navigate")}
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl"
                style={{ background: trip.color }}
                onClick={() => markArrived(false)}
                disabled={logging}
              >
                {logging ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t("goMode.markVisited")}
              </Button>
            </div>

            {currentIdx + 1 < ordered.length && (
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">{t("goMode.nextStop")}:</span>
                <span className="truncate">{ordered[currentIdx + 1].location?.title}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border/40 p-4 space-y-1 max-h-40 overflow-auto">
        {ordered.map((stop, i) => (
          <div
            key={stop.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all",
              i === currentIdx && "bg-primary/5 font-semibold",
              visited.has(stop.location?.id ?? "") && "opacity-50 line-through"
            )}
          >
            <span
              className="h-5 w-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0"
              style={{
                background: i <= currentIdx ? `${trip.color}20` : "transparent",
                color: i <= currentIdx ? trip.color : "inherit",
                border: `1px solid ${trip.color}30`,
              }}
            >
              {i + 1}
            </span>
            {stop.location?.title ?? "Stop"}
          </div>
        ))}
      </div>
    </div>
  );
}
