"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Route, MapPin, Plus, Trash2, Loader2,
  ChevronUp, ChevronDown, Share2, Calendar, Navigation, Shuffle, TrendingUp,
} from "lucide-react";
import * as turf from "@turf/turf";
import { Button } from "@/components/ui/button";
import { cn, formatLocalizedDate } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addLocationToTrip,
  removeLocationFromTrip,
  reorderTripLocations,
  deleteTrip,
} from "@/lib/actions/trips";
import { enqueueSync } from "@/lib/offline/db";
import { searchLocationsForPicker } from "@/lib/actions/locations";
import { DbShareDialog } from "@/components/shared/DbShareDialog";
import { MapView } from "@/components/map/MapView";
import type { MapLocation } from "@/lib/map/types";
import { TripGoMode } from "@/components/trips/TripGoMode";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type Trip = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions/trips").getTripById>>>;
type PickerLoc = Awaited<ReturnType<typeof searchLocationsForPicker>>[number];

function StopWeather({ lat, lng, date }: { lat: number; lng: number; date: Date }) {
  const [temp, setTemp] = useState<string | null>(null);
  useEffect(() => {
    const dateStr = date.toISOString().split("T")[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;
    fetch(url)
      .then((r) => r.json())
      .then((d: { daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[] } }) => {
        const max = d.daily?.temperature_2m_max?.[0];
        const min = d.daily?.temperature_2m_min?.[0];
        if (max != null && min != null) setTemp(`${Math.round(min)}–${Math.round(max)}°C`);
      })
      .catch(() => {});
  }, [lat, lng, date]);
  if (!temp) return null;
  return <span className="text-xs text-muted-foreground ms-1">🌡 {temp}</span>;
}

interface Props {
  trip: Trip;
  seedLocations: PickerLoc[];
}

export function TripDetailClientPage({ trip: initialTrip, seedLocations }: Props) {
  const t = useTranslations("trips");
  const locale = useLocale();
  const tc = useTranslations("common");
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [goModeOpen, setGoModeOpen] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [elevations, setElevations] = useState<number[] | null>(null);
  const [loadingElevation, setLoadingElevation] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "days">("list");
  const [pickerQuery, setPickerQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PickerLoc[] | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);

  const existingIds = useMemo(
    () => new Set(trip.locations.map((s) => s.locationId)),
    [trip.locations]
  );
  const pickerRows = pickerQuery.trim() ? (searchResults ?? []) : seedLocations;
  const available = pickerRows.filter((l) => !existingIds.has(l.id));

  useEffect(() => {
    if (!addOpen) return;
    const q = pickerQuery.trim();
    if (!q) return;
    const handle = window.setTimeout(() => {
      setPickerLoading(true);
      void searchLocationsForPicker({
        query: q,
        excludeIds: [...existingIds],
        take: 50,
      })
        .then((rows) => setSearchResults(rows))
        .catch(() => {
          /* keep previous rows */
        })
        .finally(() => setPickerLoading(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [pickerQuery, addOpen, existingIds]);

  const tripPolyline = useMemo(() => {
    return trip.locations
      .filter((s) => s.location)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        lat: s.location!.latitude,
        lng: s.location!.longitude,
        color: trip.color,
      }));
  }, [trip.locations, trip.color]);

  const mapLocations: MapLocation[] = useMemo(() => {
    return trip.locations
      .filter((s) => s.location)
      .map((s) => ({
        id: s.location!.id,
        title: s.location!.title ?? t("stopFallback"),
        latitude: s.location!.latitude,
        longitude: s.location!.longitude,
        categoryColor: s.location?.category?.color ?? trip.color,
        categoryIcon: "map-pin",
        isFavorite: false,
        isVisited: false,
      }));
  }, [trip.locations, trip.color, t]);

  async function handleAddStop() {
    if (!selectedLocId) return;
    const picked = available.find((l) => l.id === selectedLocId);
    setLoading(true);
    try {
      if (!navigator.onLine) {
        await enqueueSync("trip-add", { tripId: trip.id, locationId: selectedLocId });
        if (picked) {
          setTrip((prev) => {
            const sortOrder = prev.locations.length;
            // ponytail: slim picker row → trip-stop shape for offline UI only
            const optimistic = {
              id: `offline-${selectedLocId}`,
              tripId: prev.id,
              locationId: selectedLocId,
              sortOrder,
              notes: null,
              stayDuration: null,
              arrivalOffset: null,
              createdAt: new Date(),
              location: {
                id: picked.id,
                title: picked.title,
                latitude: picked.latitude,
                longitude: picked.longitude,
                category: picked.category
                  ? { color: picked.category.color, icon: "map-pin", name: "" }
                  : null,
                photos: [],
              },
            } as unknown as Trip["locations"][number];
            return { ...prev, locations: [...prev.locations, optimistic] };
          });
        }
        setAddOpen(false);
        setSelectedLocId("");
        toast({
          title: t("stopAdded"),
          description: t("goMode.offlineQueued"),
          variant: "success",
        });
        return;
      }
      await addLocationToTrip(trip.id, selectedLocId);
      setAddOpen(false);
      setSelectedLocId("");
      toast({ title: t("stopAdded"), variant: "success" });
      router.refresh();
    } catch (e) {
      toast({ title: t("stopAddFailed"), description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function persistOrder(ordered: Trip["locations"]) {
    const ids = ordered.map((s) => s.locationId);
    const next = ordered.map((s, i) => ({ ...s, sortOrder: i }));
    setTrip((prev) => ({ ...prev, locations: next }));
    if (!navigator.onLine) {
      await enqueueSync("trip-reorder", { tripId: trip.id, orderedIds: ids });
      toast({
        title: t("reordered"),
        description: t("goMode.offlineQueued"),
        variant: "success",
      });
      return;
    }
    await reorderTripLocations(trip.id, ids);
  }

  async function moveStop(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= trip.locations.length) return;
    const ordered = [...trip.locations];
    [ordered[index], ordered[newIndex]] = [ordered[newIndex], ordered[index]];
    setBusy(ordered[newIndex].id);
    try {
      await persistOrder(ordered);
    } catch {
      toast({ title: t("reorderFailed"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteTrip() {
    if (!confirm(t("deleteConfirm"))) return;
    if (!navigator.onLine) {
      await enqueueSync("trip-delete", { tripId: trip.id });
      toast({
        title: t("deleted"),
        description: t("goMode.offlineQueued"),
        variant: "destructive",
      });
      router.push("/trips");
      return;
    }
    await deleteTrip(trip.id);
    router.push("/trips");
  }

  async function optimizeOrder() {
    // ponytail: nearest-neighbor O(n²), fine for ≤20 stops
    const stops = trip.locations
      .filter((s) => s.location)
      .map((s) => ({ ...s, pt: turf.point([s.location!.longitude, s.location!.latitude]) }));
    if (stops.length < 3) return;
    setOptimizing(true);
    try {
      const ordered: typeof stops = [stops[0]];
      const remaining = stops.slice(1);
      while (remaining.length) {
        const last = ordered[ordered.length - 1];
        let nearest = 0;
        let minD = Infinity;
        remaining.forEach((s, i) => {
          const d = turf.distance(last.pt, s.pt);
          if (d < minD) { minD = d; nearest = i; }
        });
        ordered.push(remaining.splice(nearest, 1)[0]);
      }
      const withoutPts: Trip["locations"] = ordered.map((s) => {
        const { pt, ...rest } = s;
        void pt;
        return rest;
      });
      await persistOrder(withoutPts);
      toast({ title: t("routeOptimized"), variant: "success" });
    } catch {
      toast({ title: t("optimizeFailed"), variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  }

  async function loadElevation() {
    const stops = trip.locations.filter((s) => s.location);
    if (stops.length < 2) return;
    setLoadingElevation(true);
    try {
      const locs = stops.map((s) => `${s.location!.latitude},${s.location!.longitude}`).join("|");
      const res = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${locs}`);
      if (!res.ok) throw new Error("elevation fetch failed");
      const data = await res.json() as { results: { elevation: number }[] };
      setElevations(data.results.map((r) => Math.round(r.elevation)));
    } catch {
      toast({ title: t("elevationUnavailable"), variant: "destructive" });
    } finally {
      setLoadingElevation(false);
    }
  }

  async function handleRemoveStop(locationId: string) {
    if (!confirm(t("removeStopConfirm"))) return;
    setBusy(locationId);
    try {
      if (!navigator.onLine) {
        await enqueueSync("trip-remove", { tripId: trip.id, locationId });
        setTrip((prev) => ({
          ...prev,
          locations: prev.locations.filter((s) => s.locationId !== locationId),
        }));
        toast({
          title: t("stopRemoved"),
          description: t("goMode.offlineQueued"),
          variant: "success",
        });
        return;
      }
      await removeLocationFromTrip(trip.id, locationId);
      setTrip((prev) => ({
        ...prev,
        locations: prev.locations.filter((s) => s.locationId !== locationId),
      }));
      toast({ title: t("stopRemoved"), variant: "success" });
      router.refresh();
    } catch (e) {
      toast({ title: t("stopRemoveFailed"), description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 print-trip-sheet">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 glass-strong shrink-0 no-print">
        <Button variant="ghost" size="icon-sm" className="rounded-xl" asChild>
          <Link href="/trips"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm truncate">{trip.name}</h1>
          {trip.startDate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatLocalizedDate(trip.startDate, "MMM d, yyyy", locale)}
              {trip.endDate && ` — ${formatLocalizedDate(trip.endDate, "MMM d, yyyy", locale)}`}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => setShareOpen(true)}>
          <Share2 className="h-3.5 w-3.5" />
        </Button>
        {trip.locations.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0"
            onClick={() => setGoModeOpen(true)}
          >
            <Navigation className="h-3.5 w-3.5" />
            {t("startTrip")}
          </Button>
        )}
        <Button size="sm" className="rounded-xl shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> {t("addStop")}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Trip mini-map */}
        {mapLocations.length > 0 && (
          <div className="rounded-2xl overflow-hidden h-48 sm:h-64 mb-4 border border-border/50">
            <MapView
              locations={mapLocations}
              onLocationClick={() => {}}
              showClusters={false}
              tripPolyline={tripPolyline}
              className="h-full w-full"
            />
          </div>
        )}

        {trip.description && (
          <p className="text-sm text-muted-foreground mb-4">{trip.description}</p>
        )}

        {trip.locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30dvh] text-center gap-4">
            <Route className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">{t("noStops")}</p>
            <p className="text-sm text-muted-foreground">{t("noStopsHint")}</p>
            <Button className="rounded-xl" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> {t("addFirstStop")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {/* View mode toggle */}
            <div className="flex gap-2 items-center">
              <div className="flex border border-border/60 rounded-xl overflow-hidden text-xs">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("px-3 py-1.5 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode("days")}
                  className={cn("px-3 py-1.5 transition-colors", viewMode === "days" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  By Day
                </button>
              </div>
            </div>

            {viewMode === "days" ? (
              // Group stops by arrivalOffset (day)
              (() => {
                const sorted = [...trip.locations].sort((a, b) => a.sortOrder - b.sortOrder);
                const byDay = new Map<number, typeof sorted>();
                for (const stop of sorted) {
                  const day = (stop.arrivalOffset ?? 0);
                  if (!byDay.has(day)) byDay.set(day, []);
                  byDay.get(day)!.push(stop);
                }
                const baseDate = trip.startDate ? new Date(trip.startDate) : null;
                return [...byDay.entries()].sort(([a], [b]) => a - b).map(([day, stops]) => {
                  const dateStr = baseDate
                    ? formatLocalizedDate(new Date(baseDate.getTime() + day * 86400000), "EEE, MMM d", locale)
                    : `Day ${day + 1}`;
                  return (
                    <div key={day} className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground border-b border-border/40 pb-1">{dateStr}</h3>
                      {stops.map((stop) => (
                        <div key={stop.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${stop.location?.category?.color ?? trip.color}20`, color: stop.location?.category?.color ?? trip.color }}>
                            {stop.sortOrder + 1}
                          </div>
                          <p className="font-medium text-sm flex-1 truncate">{stop.location?.title ?? t("stopFallback")}</p>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()
            ) : null}

            {viewMode === "list" && trip.locations.map((stop, index) => (
              <div
                key={stop.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card hover:border-primary/20 transition-all"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: `${stop.location?.category?.color ?? trip.color}20`,
                    color: stop.location?.category?.color ?? trip.color,
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{stop.location?.title ?? t("stopFallback")}</p>
                  {stop.location && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                    </p>
                  )}
                  {stop.location && trip.startDate && (
                    <StopWeather
                      lat={stop.location.latitude}
                      lng={stop.location.longitude}
                      date={new Date(new Date(trip.startDate).getTime() + (stop.arrivalOffset ?? 0) * 86400000)}
                    />
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0 || busy === stop.id}
                    onClick={() => moveStop(index, -1)}
                    className="rounded-lg"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === trip.locations.length - 1 || busy === stop.id}
                    onClick={() => moveStop(index, 1)}
                    className="rounded-lg"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link href={`/app?spot=${stop.locationId}`}>
                      <MapPin className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg text-destructive"
                    disabled={busy === stop.locationId}
                    onClick={() => handleRemoveStop(stop.locationId)}
                    aria-label={t("removeStop")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {trip.locations.length > 0 && (
          <div className="mt-4 max-w-2xl flex flex-wrap gap-2">
            {trip.locations.length >= 3 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={optimizeOrder}
                disabled={optimizing}
              >
                {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                Optimize order
              </Button>
            )}
            {trip.locations.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={loadElevation}
                disabled={loadingElevation}
              >
                {loadingElevation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                {t("elevation")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => window.print()}
            >
              {t("printTrip")}
            </Button>
          </div>
        )}

        {elevations && elevations.length >= 2 && (
          <div className="mt-4 max-w-2xl rounded-2xl border border-border/50 p-4 bg-card/50">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> {t("elevationProfile")}
            </p>
            <ElevationSparkline elevations={elevations} />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
              <span>{t("elevationMax", { m: Math.max(...elevations) })}</span>
              <span>{t("elevationMin", { m: Math.min(...elevations) })}</span>
              <span>
                {t("elevationDelta", {
                  m: Math.max(...elevations) - Math.min(...elevations),
                })}
              </span>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-border/50 max-w-2xl">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground rounded-xl"
            onClick={handleDeleteTrip}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("deleteTrip")}
          </Button>
        </div>
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            setPickerQuery("");
            setSelectedLocId("");
            setSearchResults(null);
          }
        }}
      >
        <DialogContent description={t("addStopTitle")}>
          <DialogHeader>
            <DialogTitle>{t("addStopTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder={t("searchSpotsPlaceholder")}
              className="rounded-xl h-11"
              autoFocus
            />
            {pickerLoading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {tc("loading")}
              </p>
            ) : available.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {pickerQuery.trim() ? t("searchSpotsEmpty") : t("allSpotsAdded")}
              </p>
            ) : (
              <Select value={selectedLocId} onValueChange={setSelectedLocId}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder={t("chooseSpot")} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleAddStop} disabled={loading || !selectedLocId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("addStop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DbShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tripId={trip.id}
        title={trip.name}
      />

      {goModeOpen && (
        <TripGoMode
          trip={{ id: trip.id, name: trip.name, color: trip.color, emergencyContact: trip.emergencyContact, emergencyPhone: trip.emergencyPhone }}
          stops={trip.locations}
          onClose={() => setGoModeOpen(false)}
        />
      )}
    </div>
  );
}

function ElevationSparkline({ elevations }: { elevations: number[] }) {
  const h = 56;
  const w = 400;
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const range = max - min || 1;
  const step = w / (elevations.length - 1);
  const pts = elevations.map((e, i) => `${i * step},${h - ((e - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill="currentColor"
        className="text-primary/10"
        stroke="none"
      />
    </svg>
  );
}
