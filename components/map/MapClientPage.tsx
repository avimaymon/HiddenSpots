"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { LocationDetailPanel } from "@/components/map/shared/LocationDetailPanel";
import { AddLocationDialog } from "@/components/locations/AddLocationDialog";
import type { LocationCreatedPayload } from "@/components/locations/AddLocationDialog";
import { MapSidebar } from "@/components/map/MapSidebar";
import { useMapStore } from "@/lib/store/map";
import type { MapLocation } from "@/lib/map/types";
import { Plus, Layers, X, LocateFixed, Search, Ruler, CircleDot, Flame, CheckCircle2, Route, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSettingsStore } from "@/lib/store/settings";
import { MapChipBar } from "@/components/mobile/MapChipBar";
import { MobileLocationSheet } from "@/components/mobile/MobileLocationSheet";
import { MobileSearchScreen } from "@/components/mobile/MobileSearchScreen";
import { QuickAddSheet } from "@/components/map/shared/QuickAddSheet";
import { CreateFromPhotoButton } from "@/components/map/shared/CreateFromPhotoButton";
import {
  cacheLocationsForOffline,
  enqueueSync,
  getOfflineLocations,
} from "@/lib/offline/db";
import {
  COLLECTIONS_CACHE_KEY,
  ID_REMAP_EVENT,
  type IdRemapDetail,
  writeEntityCache,
} from "@/lib/offline/entity-cache";
import { distance as turfDistance } from "@turf/turf";
import { toast } from "@/hooks/use-toast";
import { createVisit } from "@/lib/actions/visits";
import { track } from "@/lib/analytics";
import { fetchCollectionMemberships, fetchMapLocationsInBounds } from "@/lib/actions/map";
import { bboxFromViewState } from "@/lib/map/viewport";
import type { MapBounds } from "@/lib/map/types";
import { pickCheckinTarget } from "@/lib/geo/checkin";
import { formatDistance } from "@/lib/utils";
import { haptic } from "@/lib/haptic";
import { useDir } from "@/hooks/use-dir";
import { useLocale } from "next-intl";
import { GeoJsonOverlayButton } from "@/components/map/shared/GeoJsonOverlay";
import { GpxRecorder } from "@/components/map/shared/GpxRecorder";
import { TracksSheet } from "@/components/map/shared/TracksSheet";

const CHECKIN_MAX_M = 200;

const RADIUS_KM_OPTIONS = [5, 10, 25] as const;

type LocationRow = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isVisited: boolean;
  visitCount?: number;
  coverPhotoUrl: string | null;
  categoryId: string | null;
  category: { color: string; icon: string; name: string } | null;
  photos: { url: string }[];
};

interface Props {
  initialLocations: LocationRow[];
  collections: { id: string; name: string; color: string; _count: { locations: number } }[];
  categories: { id: string; name: string; color: string; icon: string }[];
  collectionMembers: { collectionId: string; locationId: string }[];
  atlasTruncated?: boolean;
  atlasTotalCount?: number;
}

export function MapClientPage({
  initialLocations,
  collections,
  categories,
  collectionMembers,
  atlasTruncated = false,
  atlasTotalCount,
}: Props) {
  const searchParams = useSearchParams();
  const {
    selectedLocationId,
    isAddingLocation,
    setSelectedLocation,
    startAddingLocation,
    cancelAddingLocation,
    pendingCoords,
    showClusters,
    activeCollectionIds,
    setActiveCollectionIds,
    setViewState,
    viewState,
  } = useMapStore();

  const { latitude: myLat, longitude: myLng, refresh: refreshGeo, loading: geoLoading } =
    useGeolocation(false);

  const t = useTranslations("map");
  const locale = useLocale();
  const dir = useDir();
  const { setTheme } = useTheme();
  const trailDay = useSettingsStore((s) => s.trailDay);
  const setTrailDay = useSettingsStore((s) => s.setTrailDay);
  const panelX = dir === "rtl" ? "-100%" : "100%";
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [locations, setLocations] = useState(initialLocations);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [measureKm, setMeasureKm] = useState<number | null>(null);
  const [radiusActive, setRadiusActive] = useState(false);
  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_KM_OPTIONS)[number]>(10);
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [geojsonOverlay, setGeojsonOverlay] = useState<GeoJSON.FeatureCollection | null>(null);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showTruncationHint, setShowTruncationHint] = useState(atlasTruncated);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [fetchedMembers, setFetchedMembers] = useState(collectionMembers);
  /** Key of last successful membership fetch — avoids empty-marker flash while loading. */
  const [membersReadyKey, setMembersReadyKey] = useState(() =>
    collectionMembers.length
      ? [...new Set(collectionMembers.map((m) => m.collectionId))].sort().join(",")
      : ""
  );
  const [activeTrack, setActiveTrack] = useState<{
    id: string;
    points: { lat: number; lng: number }[];
  } | null>(null);

  const mapLat = viewState.latitude;
  const mapLng = viewState.longitude;
  const mapZoom = viewState.zoom;

  // Seed collection list for offline "add to collection" dialog.
  useEffect(() => {
    writeEntityCache(
      COLLECTIONS_CACHE_KEY,
      collections.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        _count: { locations: c._count.locations },
      }))
    );
  }, [collections]);

  // Fill atlas gaps when panning beyond the initial favorites-first cap.
  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const handle = window.setTimeout(() => {
      // Prefer real provider bounds; heuristic only until first moveend.
      const bounds =
        mapBounds ??
        bboxFromViewState({ latitude: mapLat, longitude: mapLng, zoom: mapZoom });
      void fetchMapLocationsInBounds(bounds)
        .then((rows) => {
          if (!rows.length) return;
          setLocations((prev) => {
            const byId = new Map(prev.map((l) => [l.id, l]));
            for (const row of rows) byId.set(row.id, row);
            return [...byId.values()];
          });
        })
        .catch(() => {
          /* offline / unauthorized — keep seed markers */
        });
    }, 450);
    return () => window.clearTimeout(handle);
  }, [mapLat, mapLng, mapZoom, mapBounds]);

  async function handleQuickCheckin() {
    setCheckingIn(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const pick = pickCheckinTarget(locations, lat, lng, CHECKIN_MAX_M);
      if (!pick.ok) {
        if (pick.reason === "no_spots") {
          toast({ title: t("checkinNoSpots"), variant: "destructive" });
        } else {
          const distLabel = formatDistance(pick.distanceM ?? 0, locale);
          toast({
            title: t("checkinTooFar", {
              title: pick.nearest?.title ?? "",
              distance: distLabel,
            }),
            variant: "destructive",
          });
          if (pick.nearest) setSelectedLocation(pick.nearest.id);
        }
        return;
      }
      const distLabel = formatDistance(pick.distanceM, locale);
      const ok = window.confirm(
        t("checkinConfirm", { title: pick.location.title, distance: distLabel })
      );
      if (!ok) return;

      const payload = { locationId: pick.location.id, visitedAt: new Date().toISOString() };
      if (!navigator.onLine) {
        await enqueueSync("visit", payload);
        track("visit", { method: "checkin", offline: true });
        toast({
          title: t("checkinSuccess", { title: pick.location.title }),
          description: t("checkinOffline"),
          variant: "success",
        });
      } else {
        await createVisit(payload);
        track("visit", { method: "checkin", offline: false });
        toast({ title: t("checkinSuccess", { title: pick.location.title }), variant: "success" });
      }
      haptic([50, 30, 50]);
    } catch {
      toast({ title: t("couldNotGetLocation"), variant: "destructive" });
    } finally {
      setCheckingIn(false);
    }
  }

  useEffect(() => {
    const spotId = searchParams.get("spot");
    if (spotId && locations.some((l) => l.id === spotId)) {
      setSelectedLocation(spotId);
    }
    const collectionId = searchParams.get("collection");
    if (collectionId) {
      setActiveCollectionIds([collectionId]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSidebar(true);
    }
  }, [searchParams, locations, setSelectedLocation, setActiveCollectionIds]);

  useEffect(() => {
    cacheLocationsForOffline(locations);
  }, [locations]);

  // Airplane mode: merge Dexie atlas pack so favorites survive without viewport fill.
  useEffect(() => {
    if (typeof navigator === "undefined" || navigator.onLine) return;
    let cancelled = false;
    void getOfflineLocations().then((cached) => {
      if (cancelled || !cached.length) return;
      setLocations((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const extras = cached
          .filter((c) => !ids.has(c.id))
          .map((c) => ({
            id: c.id,
            title: c.title,
            latitude: c.latitude,
            longitude: c.longitude,
            isFavorite: c.isFavorite,
            isVisited: c.isVisited,
            coverPhotoUrl: c.coverPhotoUrl,
            categoryId: null as string | null,
            category: {
              color: c.categoryColor,
              icon: c.categoryIcon,
              name: "",
            },
            photos: c.coverPhotoUrl ? [{ url: c.coverPhotoUrl }] : [],
          }));
        return extras.length ? [...prev, ...extras] : prev;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // After offline create syncs, rewrite optimistic client ids → server ids.
  useEffect(() => {
    function onRemap(e: Event) {
      const { clientId, serverId } = (e as CustomEvent<IdRemapDetail>).detail;
      setLocations((prev) =>
        prev.map((l) => (l.id === clientId ? { ...l, id: serverId } : l))
      );
      if (useMapStore.getState().selectedLocationId === clientId) {
        setSelectedLocation(serverId);
      }
    }
    window.addEventListener(ID_REMAP_EVENT, onRemap);
    return () => window.removeEventListener(ID_REMAP_EVENT, onRemap);
  }, [setSelectedLocation]);

  function toggleTrailDay() {
    const next = !trailDay;
    setTrailDay(next);
    if (next) {
      setTheme("sun");
      setNearbyOnly(true);
      setShowHeatmap(false);
      setMeasureMode(false);
      setRadiusActive(false);
      setToolsOpen(false);
    }
    track("trail_day_toggle", { on: next });
  }

  // Trail Day: keep the screen awake while the map is visible.
  useEffect(() => {
    if (!trailDay || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        /* unsupported / denied — fine */
      }
    }

    void acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void sentinel?.release();
      sentinel = null;
    };
  }, [trailDay]);

  const membersKey = [...activeCollectionIds].sort().join(",");
  const membershipsLoading =
    activeCollectionIds.length > 0 && membersReadyKey !== membersKey;

  // Lazy-load memberships only for active collection filters.
  useEffect(() => {
    if (activeCollectionIds.length === 0) return;
    const key = [...activeCollectionIds].sort().join(",");
    let cancelled = false;
    void fetchCollectionMemberships(activeCollectionIds)
      .then((rows) => {
        if (cancelled) return;
        setFetchedMembers(rows);
        setMembersReadyKey(key);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedMembers([]);
        setMembersReadyKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCollectionIds]);

  const members = useMemo(() => {
    if (activeCollectionIds.length === 0) return [];
    return fetchedMembers.filter((m) => activeCollectionIds.includes(m.collectionId));
  }, [activeCollectionIds, fetchedMembers]);

  const filteredLocations = useMemo(() => {
    let result = locations;
    // While memberships load, skip the empty Set filter (keeps markers visible).
    if (activeCollectionIds.length > 0 && !membershipsLoading) {
      const allowed = new Set<string>();
      for (const m of members) {
        allowed.add(m.locationId);
      }
      result = result.filter((l) => allowed.has(l.id));
    }
    if (nearbyOnly && myLat != null && myLng != null) {
      result = result.filter((l) => {
        const km = turfDistance([myLng, myLat], [l.longitude, l.latitude], { units: "kilometers" });
        return km <= 25;
      });
    }
    if (radiusActive && radiusCenter && radiusKm > 0) {
      result = result.filter((l) => {
        const km = turfDistance(
          [radiusCenter.lng, radiusCenter.lat],
          [l.longitude, l.latitude],
          { units: "kilometers" }
        );
        return km <= radiusKm;
      });
    }
    return result;
  }, [
    locations,
    members,
    activeCollectionIds,
    membershipsLoading,
    nearbyOnly,
    myLat,
    myLng,
    radiusActive,
    radiusCenter,
    radiusKm,
  ]);

  const mapLocations: MapLocation[] = filteredLocations.map((loc) => ({
    id: loc.id,
    title: loc.title,
    latitude: loc.latitude,
    longitude: loc.longitude,
    categoryColor: loc.category?.color ?? "#22c55e",
    categoryIcon: loc.category?.icon ?? "map-pin",
    isFavorite: loc.isFavorite,
    isVisited: loc.isVisited,
    visitCount: loc.visitCount ?? (loc.isVisited ? 1 : 0),
    coverPhotoUrl: loc.photos[0]?.url ?? loc.coverPhotoUrl,
  }));

  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (measureMode) {
        setMeasurePoints((prev) => {
          const next = prev.length >= 2 ? [coords] : [...prev, coords];
          if (next.length === 2) {
            const km = turfDistance(
              [next[0].lng, next[0].lat],
              [next[1].lng, next[1].lat],
              { units: "kilometers" }
            );
            setMeasureKm(km);
            toast({
              title: t("distanceResult", { km: km < 10 ? km.toFixed(2) : km.toFixed(1) }),
              variant: "success",
            });
          } else {
            setMeasureKm(null);
          }
          return next;
        });
        return;
      }
      startAddingLocation(coords);
      setAddDialogOpen(true);
    },
    [measureMode, startAddingLocation, t]
  );

  const handleLocationCreated = (newLoc: LocationCreatedPayload) => {
    const row: LocationRow = {
      id: newLoc.id,
      title: newLoc.title,
      latitude: newLoc.latitude,
      longitude: newLoc.longitude,
      isFavorite: newLoc.isFavorite,
      isVisited: newLoc.isVisited,
      coverPhotoUrl: newLoc.coverPhotoUrl ?? newLoc.photos[0]?.url ?? null,
      categoryId: newLoc.categoryId,
      category: newLoc.category
        ? { color: newLoc.category.color, icon: newLoc.category.icon, name: newLoc.category.name }
        : null,
      photos: newLoc.photos.map((p) => ({ url: p.url })),
    };
    setLocations((prev) => [...prev, row]);
    cancelAddingLocation();
    setAddDialogOpen(false);
    setSelectedLocation(newLoc.id);
  };

  const handleAddClick = () => {
    setMeasureMode(false);
    setSelectedLocation(null);
    if (typeof window !== "undefined" && window.innerWidth < 768 && myLat != null && myLng != null) {
      setQuickAddOpen(true);
    } else {
      startAddingLocation();
    }
  };

  const handleGpsQuickAdd = () => {
    setMeasureMode(false);
    setSelectedLocation(null);
    refreshGeo();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startAddingLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setQuickAddOpen(true);
        toast({ title: t("gpsAddReady"), variant: "success" });
      },
      () => toast({ title: t("couldNotGetLocation"), variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleMyLocation = () => {
    if (myLat != null && myLng != null) {
      setViewState({ latitude: myLat, longitude: myLng, zoom: 14 });
      toast({ title: t("centeredOnLocation"), variant: "success" });
      return;
    }
    refreshGeo();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setViewState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          zoom: 14,
        });
        toast({ title: t("centeredOnLocation"), variant: "success" });
      },
      () => toast({ title: t("couldNotGetLocation"), variant: "destructive" })
    );
  };

  const toggleMeasure = () => {
    setMeasureMode((v) => {
      const next = !v;
      if (next) {
        setRadiusActive(false);
        cancelAddingLocation();
      } else {
        setMeasurePoints([]);
        setMeasureKm(null);
      }
      return next;
    });
  };

  const toggleRadius = () => {
    setRadiusActive((v) => {
      const next = !v;
      if (next) {
        setMeasureMode(false);
        setMeasurePoints([]);
        setMeasureKm(null);
        const center =
          myLat != null && myLng != null
            ? { lat: myLat, lng: myLng }
            : { lat: viewState.latitude, lng: viewState.longitude };
        setRadiusCenter(center);
        toast({ title: t("radiusActive", { km: radiusKm }), variant: "success" });
      } else {
        setRadiusCenter(null);
      }
      return next;
    });
  };

  const cycleRadiusKm = () => {
    const idx = RADIUS_KM_OPTIONS.indexOf(radiusKm);
    const next = RADIUS_KM_OPTIONS[(idx + 1) % RADIUS_KM_OPTIONS.length];
    setRadiusKm(next);
    if (radiusActive) {
      toast({ title: t("radiusActive", { km: next }), variant: "success" });
    }
  };

  const mapClickActive = isAddingLocation || measureMode;

  return (
    <div className="relative flex-1 h-full overflow-hidden">
      <MapView
        locations={mapLocations}
        selectedId={selectedLocationId}
        onLocationClick={setSelectedLocation}
        onMapClick={mapClickActive ? handleMapClick : undefined}
        onBoundsChange={setMapBounds}
        isAddingLocation={isAddingLocation}
        measureMode={measureMode}
        measurePoints={measurePoints}
        radiusCenter={radiusActive ? radiusCenter : null}
        radiusKm={radiusActive ? radiusKm : null}
        showClusters={showClusters}
        showHeatmap={showHeatmap}
        geojsonOverlay={geojsonOverlay}
        tripPolyline={
          activeTrack && activeTrack.points.length >= 2
            ? activeTrack.points.map((p) => ({ ...p, color: "#0d9488" }))
            : undefined
        }
        className="absolute inset-0"
      />

      {/* Top toolbar — desktop only; mobile uses FAB + chip bar */}
      <div className="hidden md:flex absolute top-4 start-4 z-10 gap-2">
        <div className="flex gap-2 glass-strong rounded-2xl p-1.5 shadow-float">
          <Button
            size="sm"
            onClick={handleAddClick}
            className="rounded-xl gap-1.5 h-9 px-3 shadow-none fab-nature border-0 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {t("addSpot")}
          </Button>
          <CreateFromPhotoButton
            className="rounded-xl h-9 gap-1.5"
            onReady={() => {
              setQuickAddOpen(true);
            }}
          />
          <Button
            variant={trailDay ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={toggleTrailDay}
            className="rounded-xl h-9 w-9"
            title={t("trailDayHint")}
            aria-label={trailDay ? t("trailDayOn") : t("trailDay")}
            aria-pressed={trailDay}
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSearch(true)}
            className="rounded-xl h-9 w-9"
            title={t("searchSpots")}
            aria-label={t("searchSpots")}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant={showSidebar ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setShowSidebar((v) => !v)}
            className="rounded-xl h-9 w-9"
            title={t("layers")}
            aria-label={t("layers")}
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleMyLocation}
            disabled={geoLoading}
            className="rounded-xl h-9 w-9"
            title={t("myLocation")}
            aria-label={t("myLocation")}
          >
            <LocateFixed className={cn("h-4 w-4", geoLoading && "animate-pulse")} />
          </Button>
          {!trailDay && (
            <>
              <Button
                variant={measureMode ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={toggleMeasure}
                className="rounded-xl h-9 w-9"
                title={t("measure")}
                aria-label={t("measure")}
              >
                <Ruler className="h-4 w-4" />
              </Button>
              <Button
                variant={radiusActive ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={toggleRadius}
                onContextMenu={(e) => {
                  e.preventDefault();
                  cycleRadiusKm();
                }}
                className="rounded-xl h-9 w-9"
                title={t("radiusSearch")}
                aria-label={t("radiusSearch")}
              >
                <CircleDot className="h-4 w-4" />
              </Button>
              <Button
                variant={showHeatmap ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setShowHeatmap((v) => !v)}
                className="rounded-xl h-9 w-9"
                title={t("heatmap")}
                aria-label={t("heatmap")}
              >
                <Flame className="h-4 w-4" />
              </Button>
              <GeoJsonOverlayButton
                onDataChange={setGeojsonOverlay}
                hasData={geojsonOverlay != null}
              />
            </>
          )}
          <GpxRecorder
            locationId={selectedLocationId}
            atlasSpots={locations}
            onOpenTracks={() => setTracksOpen(true)}
          />
          <Button
            variant={tracksOpen || activeTrack ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setTracksOpen((v) => !v)}
            className="rounded-xl h-9 w-9"
            title={t("tracksTitle")}
            aria-label={t("tracksTitle")}
          >
            <Route className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TracksSheet
        open={tracksOpen}
        onClose={() => setTracksOpen(false)}
        activeTrackId={activeTrack?.id ?? null}
        onShowTrack={setActiveTrack}
      />

      {/* Mobile FABs — add + check-in only; secondary tools live in chip “כלים” */}
      <Button
        onClick={handleAddClick}
        onContextMenu={(e) => {
          e.preventDefault();
          handleGpsQuickAdd();
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") return;
          const timer = window.setTimeout(() => handleGpsQuickAdd(), 550);
          const clear = () => window.clearTimeout(timer);
          e.currentTarget.addEventListener("pointerup", clear, { once: true });
          e.currentTarget.addEventListener("pointerleave", clear, { once: true });
        }}
        size="icon"
        className="md:hidden fixed z-30 h-14 w-14 rounded-2xl fab-nature border-0 text-primary-foreground bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] start-4 pointer-events-auto active:scale-95 transition-transform"
        aria-label={t("addSpot")}
        title={t("addAtGpsHint")}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Button>

      <Button
        onClick={handleQuickCheckin}
        disabled={checkingIn}
        size="icon"
        className={cn(
          "md:hidden fixed z-30 rounded-2xl border-0 bg-emerald-600 hover:bg-emerald-700 text-white bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] start-20 pointer-events-auto active:scale-95 transition-transform",
          trailDay ? "h-16 w-16 shadow-lg ring-2 ring-emerald-300/60" : "h-14 w-14"
        )}
        aria-label={t("checkinAria")}
        title={t("checkinTitle")}
      >
        <CheckCircle2 className={cn(trailDay ? "h-7 w-7" : "h-6 w-6", checkingIn && "animate-pulse")} strokeWidth={2} />
      </Button>

      <MapChipBar
        onMyLocation={handleMyLocation}
        onLayers={() => setShowSidebar((v) => !v)}
        onNearby={() => setNearbyOnly((v) => !v)}
        onSearch={() => setShowSearch(true)}
        onTools={() => setToolsOpen((v) => !v)}
        onTrailDay={toggleTrailDay}
        nearbyActive={nearbyOnly}
        trailDayActive={trailDay}
        toolsActive={toolsOpen || measureMode || radiusActive || showHeatmap || tracksOpen}
        toolsExpanded={toolsOpen}
      />

      {toolsOpen && (
        <div
          id="map-field-tools"
          role="dialog"
          aria-modal="true"
          aria-label={t("fieldToolsTitle")}
          className="md:hidden absolute inset-x-3 z-20 bottom-[calc(var(--nav-height)+var(--safe-bottom)+8.5rem)] pointer-events-auto"
        >
          <div className="glass-strong rounded-2xl border border-border/50 shadow-float p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" id="map-field-tools-title">
                {t("fieldToolsTitle")}
              </p>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-muted"
                aria-label={t("cancel")}
                onClick={() => setToolsOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl justify-start gap-2"
                onClick={() => {
                  handleGpsQuickAdd();
                  setToolsOpen(false);
                }}
              >
                <LocateFixed className="h-4 w-4" />
                {t("addAtGps")}
              </Button>
              {!trailDay && (
                <>
                  <Button
                    variant={measureMode ? "secondary" : "outline"}
                    className="h-11 rounded-xl justify-start gap-2"
                    onClick={() => {
                      toggleMeasure();
                      setToolsOpen(false);
                    }}
                  >
                    <Ruler className="h-4 w-4" />
                    {t("measure")}
                  </Button>
                  <Button
                    variant={radiusActive ? "secondary" : "outline"}
                    className="h-11 rounded-xl justify-start gap-2"
                    onClick={() => {
                      toggleRadius();
                      setToolsOpen(false);
                    }}
                  >
                    <CircleDot className="h-4 w-4" />
                    {t("radiusSearch")}
                  </Button>
                  <Button
                    variant={showHeatmap ? "secondary" : "outline"}
                    className="h-11 rounded-xl justify-start gap-2"
                    onClick={() => {
                      setShowHeatmap((v) => !v);
                      setToolsOpen(false);
                    }}
                  >
                    <Flame className="h-4 w-4" />
                    {t("heatmap")}
                  </Button>
                </>
              )}
              <Button
                variant={tracksOpen || activeTrack ? "secondary" : "outline"}
                className={cn(
                  "h-11 rounded-xl justify-start gap-2",
                  trailDay ? "col-span-1" : "col-span-2"
                )}
                onClick={() => {
                  setTracksOpen(true);
                  setToolsOpen(false);
                }}
              >
                <Route className="h-4 w-4" />
                {t("tracksTitle")}
              </Button>
            </div>
            <div className="flex gap-2 pt-1">
              <div className="flex-1">
                <GpxRecorder
                  locationId={selectedLocationId}
                  atlasSpots={locations}
                  onOpenTracks={() => setTracksOpen(true)}
                />
              </div>
              {!trailDay && (
                <GeoJsonOverlayButton
                  onDataChange={setGeojsonOverlay}
                  hasData={geojsonOverlay != null}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showTruncationHint && atlasTotalCount != null && (
        <div className="absolute top-4 inset-x-0 z-10 flex justify-center px-4 pointer-events-none md:top-14">
          <button
            type="button"
            className="pointer-events-auto max-w-md text-xs font-medium rounded-xl px-3 py-2 bg-background/90 border border-border/60 shadow-sm backdrop-blur-sm text-start"
            onClick={() => setShowTruncationHint(false)}
          >
            {t("atlasTruncatedHint", {
              shown: initialLocations.length,
              total: atlasTotalCount,
            })}
          </button>
        </div>
      )}

      {(measureMode && measureKm != null) || (radiusActive && radiusCenter) ? (
        <div className="absolute top-4 inset-x-0 z-10 flex justify-center px-4 pointer-events-none md:top-16">
          <div className="glass rounded-2xl px-4 py-2 text-sm font-medium shadow-glass pointer-events-auto flex items-center gap-3">
            {measureMode && measureKm != null && (
              <span>{t("distanceResult", { km: measureKm < 10 ? measureKm.toFixed(2) : measureKm.toFixed(1) })}</span>
            )}
            {radiusActive && radiusCenter && (
              <button type="button" onClick={cycleRadiusKm} className="underline-offset-2 hover:underline">
                {t("radiusActive", { km: radiusKm })}
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-8"
              onClick={() => {
                if (measureMode) toggleMeasure();
                if (radiusActive) toggleRadius();
              }}
            >
              <X className="h-3.5 w-3.5" />
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      <MobileSearchScreen
        open={showSearch}
        onClose={() => setShowSearch(false)}
        locations={locations}
        onSelect={(id) => {
          setSelectedLocation(id);
          setShowSearch(false);
        }}
      />

      {/* Location detail — Vaul sheet on mobile, side panel on desktop */}
      <MobileLocationSheet
        open={!!selectedLocationId}
        onOpenChange={(open) => !open && setSelectedLocation(null)}
      >
        {selectedLocationId && (
          <LocationDetailPanel
            locationId={selectedLocationId}
            onClose={() => setSelectedLocation(null)}
            onDeleted={(id) => setLocations((prev) => prev.filter((l) => l.id !== id))}
            onPatched={(id, patch) =>
              setLocations((prev) =>
                prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
              )
            }
            categories={categories}
          />
        )}
      </MobileLocationSheet>

      <AnimatePresence mode="wait">
        {selectedLocationId && (
          <motion.div
            key={selectedLocationId}
            initial={{ x: panelX, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: panelX, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "hidden md:flex z-30 flex-col overflow-hidden",
              "absolute top-0 end-0 bottom-0 w-[min(100%,24rem)] lg:w-[26rem]",
              "border-s border-border/60 bg-background/98 backdrop-blur-xl shadow-2xl"
            )}
          >
            <LocationDetailPanel
              locationId={selectedLocationId}
              onClose={() => setSelectedLocation(null)}
              onDeleted={(id) => setLocations((prev) => prev.filter((l) => l.id !== id))}
              onPatched={(id, patch) =>
                setLocations((prev) =>
                  prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
                )
              }
              categories={categories}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px] md:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              key="sidebar-panel"
              initial={{ x: dir === "rtl" ? "100%" : "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir === "rtl" ? "100%" : "-100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "z-30 overflow-hidden",
                "absolute top-0 start-0 bottom-0 w-[min(85vw,18rem)]",
                "shadow-2xl"
              )}
            >
              <MapSidebar collections={collections} onClose={() => setShowSidebar(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddLocationDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) cancelAddingLocation();
        }}
        defaultCoords={pendingCoords ?? undefined}
        categories={categories}
        onCreated={handleLocationCreated}
      />

      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        coords={myLat != null && myLng != null ? { lat: myLat, lng: myLng } : null}
        categories={categories}
        onCreated={(loc) => {
          setLocations((prev) => [...prev, loc]);
          setSelectedLocation(loc.id);
        }}
      />

      {isAddingLocation && !addDialogOpen && (
        <div className="absolute bottom-[calc(var(--nav-height)+var(--safe-bottom)+4.5rem)] md:bottom-6 inset-x-0 flex justify-center z-10 px-4">
          <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-glass animate-fade-in max-w-sm w-full">
            <p className="text-sm font-medium flex-1">{t("tapToPlace")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelAddingLocation}
              className="rounded-xl h-8 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
