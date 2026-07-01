"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { LocationDetailPanel } from "@/components/map/shared/LocationDetailPanel";
import { AddLocationDialog } from "@/components/locations/AddLocationDialog";
import { MapSidebar } from "@/components/map/MapSidebar";
import { useMapStore } from "@/lib/store/map";
import type { MapLocation } from "@/lib/map/types";
import { Plus, Layers, X, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useTranslations } from "next-intl";
import { MapChipBar } from "@/components/mobile/MapChipBar";
import { MobileLocationSheet } from "@/components/mobile/MobileLocationSheet";
import { cacheLocationsForOffline } from "@/lib/offline/db";
import { distance as turfDistance } from "@turf/turf";
import { toast } from "@/hooks/use-toast";

type LocationRow = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isVisited: boolean;
  coverPhotoUrl: string | null;
  category: { color: string; icon: string } | null;
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
  } = useMapStore();

  const { latitude: myLat, longitude: myLng, refresh: refreshGeo, loading: geoLoading } =
    useGeolocation(false);

  const t = useTranslations("map");
  const [showSidebar, setShowSidebar] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [locations, setLocations] = useState(initialLocations);
  const [nearbyOnly, setNearbyOnly] = useState(false);

  useEffect(() => {
    const spotId = searchParams.get("spot");
    if (spotId && locations.some((l) => l.id === spotId)) {
      setSelectedLocation(spotId);
    }
    const collectionId = searchParams.get("collection");
    if (collectionId) {
      setActiveCollectionIds([collectionId]);
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
    return result;
  }, [locations, collectionMembers, activeCollectionIds, nearbyOnly, myLat, myLng]);

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
      startAddingLocation(coords);
      setAddDialogOpen(true);
    },
    [startAddingLocation]
  );

  const handleLocationCreated = (newLoc: LocationRow) => {
    setLocations((prev) => [...prev, newLoc]);
    cancelAddingLocation();
    setAddDialogOpen(false);
    setSelectedLocation(newLoc.id);
  };

  const handleAddClick = () => {
    setSelectedLocation(null);
    startAddingLocation();
  };

  const handleMyLocation = () => {
    if (myLat != null && myLng != null) {
      setViewState({ latitude: myLat, longitude: myLng, zoom: 14 });
      toast({ title: "Centered on your location", variant: "success" });
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
        toast({ title: "Centered on your location", variant: "success" });
      },
      () => toast({ title: "Could not get location", variant: "destructive" })
    );
  };

  return (
    <div className="relative flex-1 h-full overflow-hidden">
      <MapView
        locations={mapLocations}
        selectedId={selectedLocationId}
        onLocationClick={setSelectedLocation}
        onMapClick={isAddingLocation ? handleMapClick : undefined}
        isAddingLocation={isAddingLocation}
        showClusters={showClusters}
        className="absolute inset-0"
      />

      {/* Top toolbar — glass chip bar */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:start-4 sm:end-auto z-10 flex gap-2 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto glass rounded-2xl p-1.5 shadow-glass">
          <Button
            size="sm"
            onClick={handleAddClick}
            className="rounded-xl gap-1.5 h-9 px-3 shadow-none"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Add Spot</span>
            <span className="xs:hidden">Add</span>
          </Button>
          <Button
            variant={showSidebar ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setShowSidebar((v) => !v)}
            className="rounded-xl h-9 w-9"
            title="Layers & collections"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleMyLocation}
            disabled={geoLoading}
            className="rounded-xl h-9 w-9"
            title="My location"
          >
            <LocateFixed className={cn("h-4 w-4", geoLoading && "animate-pulse")} />
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <Button
        onClick={handleAddClick}
        size="icon"
        className="md:hidden fixed z-30 h-14 w-14 rounded-2xl shadow-lg shadow-primary/30 bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] start-4 pointer-events-auto"
        aria-label="Add new spot"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Button>

      <MapChipBar
        onMyLocation={handleMyLocation}
        onLayers={() => setShowSidebar((v) => !v)}
        onNearby={() => setNearbyOnly((v) => !v)}
        nearbyActive={nearbyOnly}
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

      {selectedLocationId && (
        <div
          className={cn(
            "hidden md:flex z-30 flex-col overflow-hidden",
            "absolute top-0 end-0 bottom-0 w-[min(100%,24rem)] lg:w-[26rem]",
            "animate-slide-in-right border-s border-border/60 bg-background/98 backdrop-blur-xl shadow-2xl"
          )}
        >
          <LocationDetailPanel
            locationId={selectedLocationId}
            onClose={() => setSelectedLocation(null)}
            categories={categories}
          />
        </div>
      )}

      {/* Collections sidebar */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px] md:hidden"
            onClick={() => setShowSidebar(false)}
          />
          <div
            className={cn(
              "z-30 overflow-hidden",
              "absolute top-0 start-0 bottom-0 w-[min(85vw,18rem)]",
              "animate-fade-in shadow-2xl"
            )}
          >
            <MapSidebar collections={collections} onClose={() => setShowSidebar(false)} />
          </div>
        </>
      )}

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
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
