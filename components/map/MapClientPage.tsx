"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { LocationDetailPanel } from "@/components/map/shared/LocationDetailPanel";
import { AddLocationDialog } from "@/components/locations/AddLocationDialog";
import { createLocation } from "@/lib/actions/locations";
type CreatedLocation = Awaited<ReturnType<typeof createLocation>>;
import { MapSidebar } from "@/components/map/MapSidebar";
import { useMapStore } from "@/lib/store/map";
import type { MapLocation } from "@/lib/map/types";
import { Plus, Layers, X, LocateFixed, Search, Ruler, CircleDot, Flame, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useTranslations } from "next-intl";
import { MapChipBar } from "@/components/mobile/MapChipBar";
import { MobileLocationSheet } from "@/components/mobile/MobileLocationSheet";
import { MobileSearchScreen } from "@/components/mobile/MobileSearchScreen";
import { QuickAddSheet } from "@/components/map/shared/QuickAddSheet";
import { CreateFromPhotoButton } from "@/components/map/shared/CreateFromPhotoButton";
import { cacheLocationsForOffline } from "@/lib/offline/db";
import { distance as turfDistance } from "@turf/turf";
import { toast } from "@/hooks/use-toast";
import { createVisit } from "@/lib/actions/visits";
import { haptic } from "@/lib/haptic";
import { useDir } from "@/hooks/use-dir";
import { GeoJsonOverlayButton } from "@/components/map/shared/GeoJsonOverlay";
import { GpxRecorder } from "@/components/map/shared/GpxRecorder";

const RADIUS_KM_OPTIONS = [5, 10, 25] as const;

type LocationRow = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isVisited: boolean;
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
}

export function MapClientPage({ initialLocations, collections, categories, collectionMembers }: Props) {
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
  const dir = useDir();
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

  async function handleQuickCheckin() {
    setCheckingIn(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const nearest = locations.reduce<typeof locations[0] | null>((best, loc) => {
        const km = turfDistance([lng, lat], [loc.longitude, loc.latitude], { units: "kilometers" });
        if (!best) return loc;
        const bestKm = turfDistance([lng, lat], [best.longitude, best.latitude], { units: "kilometers" });
        return km < bestKm ? loc : best;
      }, null);
      if (!nearest) { toast({ title: "No spots found", variant: "destructive" }); return; }
      await createVisit({ locationId: nearest.id, visitedAt: new Date().toISOString() });
      toast({ title: `✓ Checked in at ${nearest.title}`, variant: "success" });
      haptic([50, 30, 50]);
    } catch {
      toast({ title: "Could not get location", variant: "destructive" });
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

  const filteredLocations = useMemo(() => {
    let result = locations;
    if (activeCollectionIds.length > 0) {
      const allowed = new Set<string>();
      for (const m of collectionMembers) {
        if (activeCollectionIds.includes(m.collectionId)) {
          allowed.add(m.locationId);
        }
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
    collectionMembers,
    activeCollectionIds,
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

  const handleLocationCreated = (newLoc: CreatedLocation) => {
    const row: LocationRow = {
      id: newLoc.id,
      title: newLoc.title,
      latitude: newLoc.latitude,
      longitude: newLoc.longitude,
      isFavorite: newLoc.isFavorite,
      isVisited: newLoc.isVisited,
      coverPhotoUrl: newLoc.coverPhotoUrl,
      categoryId: newLoc.categoryId,
      category: newLoc.category ? { color: newLoc.category.color, icon: newLoc.category.icon, name: newLoc.category.name } : null,
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
        isAddingLocation={isAddingLocation}
        measureMode={measureMode}
        measurePoints={measurePoints}
        radiusCenter={radiusActive ? radiusCenter : null}
        radiusKm={radiusActive ? radiusKm : null}
        showClusters={showClusters}
        showHeatmap={showHeatmap}
        geojsonOverlay={geojsonOverlay}
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
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSearch(true)}
            className="rounded-xl h-9 w-9"
            title={t("searchSpots")}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant={showSidebar ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setShowSidebar((v) => !v)}
            className="rounded-xl h-9 w-9"
            title={t("layers")}
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
          >
            <LocateFixed className={cn("h-4 w-4", geoLoading && "animate-pulse")} />
          </Button>
          <Button
            variant={measureMode ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={toggleMeasure}
            className="rounded-xl h-9 w-9"
            title={t("measure")}
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
          >
            <CircleDot className="h-4 w-4" />
          </Button>
          <Button
            variant={showHeatmap ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setShowHeatmap((v) => !v)}
            className="rounded-xl h-9 w-9"
            title="Visit heatmap"
          >
            <Flame className="h-4 w-4" />
          </Button>
          <GeoJsonOverlayButton
            onDataChange={setGeojsonOverlay}
            hasData={geojsonOverlay != null}
          />
          <GpxRecorder />
        </div>
      </div>

      {/* Mobile FAB — tap to add; long-press = add at GPS */}
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

      {/* Quick Check-in FAB */}
      <Button
        onClick={handleQuickCheckin}
        disabled={checkingIn}
        size="icon"
        className="md:hidden fixed z-30 h-14 w-14 rounded-2xl border-0 bg-emerald-600 hover:bg-emerald-700 text-white bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] start-20 pointer-events-auto active:scale-95 transition-transform"
        aria-label="Quick check-in"
        title="Check in at nearest spot"
      >
        <CheckCircle2 className={cn("h-6 w-6", checkingIn && "animate-pulse")} strokeWidth={2} />
      </Button>

      <MapChipBar
        onMyLocation={handleMyLocation}
        onLayers={() => setShowSidebar((v) => !v)}
        onNearby={() => setNearbyOnly((v) => !v)}
        onSearch={() => setShowSearch(true)}
        onMeasure={toggleMeasure}
        onRadius={toggleRadius}
        nearbyActive={nearbyOnly}
        measureActive={measureMode}
        radiusActive={radiusActive}
      />

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
