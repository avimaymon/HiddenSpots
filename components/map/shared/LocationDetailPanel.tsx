"use client";

import { useEffect, useState } from "react";
import { getLocationById, toggleFavorite, toggleBucketList, deleteLocation } from "@/lib/actions/locations";
import { createVisit } from "@/lib/actions/visits";
import { EditLocationDialog } from "@/components/locations/EditLocationDialog";
import { AddToCollectionDialog } from "@/components/locations/AddToCollectionDialog";
import { AddToTripDialog } from "@/components/locations/AddToTripDialog";
import { NavigateShareDialog } from "@/components/shared/NavigateShareDialog";
import { DbShareDialog } from "@/components/shared/DbShareDialog";
import { QuickNavButtons } from "@/components/shared/QuickNavButtons";
import { useGeolocation } from "@/hooks/use-geolocation";
import { copyToClipboard } from "@/lib/navigation/external-links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Heart, Bookmark, Eye, Edit2, Trash2, MapPin, Star,
  Loader2, Camera, ExternalLink, Navigation, Share2, Copy, Check, Footprints,
  FolderPlus, Route,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props {
  locationId: string;
  onClose: () => void;
  categories?: { id: string; name: string; color: string; icon: string }[];
}

type LocationDetail = Awaited<ReturnType<typeof getLocationById>>;

export function LocationDetailPanel({ locationId, onClose, categories = [] }: Props) {
  const [location, setLocation] = useState<LocationDetail>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [dbShareOpen, setDbShareOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);
  const { distanceTo } = useGeolocation(true);

  useEffect(() => {
    setLoading(true);
    getLocationById(locationId).then((loc) => {
      setLocation(loc);
      setLoading(false);
    });
  }, [locationId]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading spot…</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">🌿</div>
        <p className="text-muted-foreground text-sm">Location not found</p>
        <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
          Close
        </Button>
      </div>
    );
  }

  const primaryPhoto = location.photos.find((p) => p.isPrimary) ?? location.photos[0];

  async function handleToggleFavorite() {
    const newVal = await toggleFavorite(locationId);
    setLocation((l) => (l ? { ...l, isFavorite: newVal } : l));
  }

  async function handleToggleBucketList() {
    const newVal = await toggleBucketList(locationId);
    setLocation((l) => (l ? { ...l, isBucketList: newVal } : l));
  }

  async function handleDelete() {
    if (!confirm("Delete this location?")) return;
    await deleteLocation(locationId);
    toast({ title: "Location deleted", variant: "destructive" });
    onClose();
  }

  async function handleQuickVisit() {
    setVisitLoading(true);
    try {
      await createVisit({ locationId, visitedAt: new Date().toISOString() });
      setLocation((l) =>
        l
          ? {
              ...l,
              isVisited: true,
              visitCount: (l.visitCount ?? 0) + 1,
              lastVisitedAt: new Date(),
            }
          : l
      );
      toast({ title: "Visit logged!", description: "Marked as visited today", variant: "success" });
    } catch {
      toast({ title: "Failed to log visit", variant: "destructive" });
    } finally {
      setVisitLoading(false);
    }
  }

  async function handleCopyCoords() {
    const ok = await copyToClipboard(`${location!.latitude}, ${location!.longitude}`);
    if (ok) {
      setCopiedCoords(true);
      toast({ title: "Coordinates copied", variant: "success" });
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  }

  const distance = distanceTo(location.latitude, location.longitude);
  const coordsPayload = {
    latitude: location.latitude,
    longitude: location.longitude,
    title: location.title,
    address: location.address,
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {primaryPhoto ? (
        <div className="relative h-40 sm:h-48 shrink-0">
          <Image src={primaryPhoto.url} alt={location.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="absolute top-3 end-3 bg-black/40 text-white hover:bg-black/60 rounded-xl backdrop-blur-sm"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-3 start-3 end-3">
            <h2 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-sm">
              {location.title}
            </h2>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 shrink-0 bg-muted/20">
          <h2 className="font-bold text-base leading-tight truncate pe-2">{location.title}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-xl shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 shrink-0 bg-background/50">
        <ActionBtn
          onClick={handleToggleFavorite}
          active={location.isFavorite}
          activeClass="text-rose-500 bg-rose-500/10"
          title="Favorite"
        >
          <Heart className={cn("h-4 w-4", location.isFavorite && "fill-current")} />
        </ActionBtn>
        <ActionBtn
          onClick={handleToggleBucketList}
          active={location.isBucketList}
          activeClass="text-amber-500 bg-amber-500/10"
          title="Bucket list"
        >
          <Bookmark className={cn("h-4 w-4", location.isBucketList && "fill-current")} />
        </ActionBtn>
        <ActionBtn
          title="Navigate & Share"
          onClick={() => setShareOpen(true)}
          className="text-primary bg-primary/10"
        >
          <Navigation className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn
          title="Log visit"
          onClick={handleQuickVisit}
          className={cn(location.isVisited && "text-green-600 bg-green-500/10")}
        >
          {visitLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Footprints className="h-4 w-4" />
          )}
        </ActionBtn>
        <ActionBtn title="Add to collection" onClick={() => setCollectionOpen(true)}>
          <FolderPlus className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn title="Add to trip" onClick={() => setTripOpen(true)}>
          <Route className="h-4 w-4" />
        </ActionBtn>
        <div className="flex-1" />
        <ActionBtn title="Share link" onClick={() => setDbShareOpen(true)}>
          <Share2 className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn title="Edit" onClick={() => setEditOpen(true)}>
          <Edit2 className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn title="Delete" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </ActionBtn>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {location.category && (
              <Badge
                style={{
                  background: `${location.category.color}18`,
                  color: location.category.color,
                  borderColor: `${location.category.color}35`,
                }}
                variant="outline"
              >
                {location.category.name}
              </Badge>
            )}
            {location.isVisited && (
              <Badge variant="success">
                <Eye className="h-3 w-3 me-1" />
                Visited
              </Badge>
            )}
            {location.isBucketList && (
              <Badge variant="warning">Bucket List</Badge>
            )}
            {location.difficulty && (
              <Badge variant="secondary">{location.difficulty}</Badge>
            )}
            {location.tags.map(({ tag }) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>

          {location.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {location.description}
            </p>
          )}

          {/* Quick navigate */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Navigate
              </p>
              {distance && (
                <span className="text-xs font-semibold text-primary">{distance} away</span>
              )}
            </div>
            <QuickNavButtons
              location={coordsPayload}
              size="md"
              onMore={() => setShareOpen(true)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl h-9"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Waze · Google Maps · Apple Maps · More
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5 text-xs">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-mono text-muted-foreground block">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </span>
              {location.address && (
                <span className="text-foreground mt-0.5 block">{location.address}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg shrink-0"
              onClick={handleCopyCoords}
              title="Copy coordinates"
            >
              {copiedCoords ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {(location.hasParking !== null ||
            location.hasWater !== null ||
            location.hasShade !== null ||
            location.isFamilyFriendly !== null ||
            location.isDogFriendly !== null) && (
            <>
              <Separator className="opacity-50" />
              <div className="grid grid-cols-2 gap-2">
                {renderBoolField("Parking", location.hasParking)}
                {renderBoolField("Water", location.hasWater)}
                {renderBoolField("Shade", location.hasShade)}
                {renderBoolField("Family Friendly", location.isFamilyFriendly)}
                {renderBoolField("Dog Friendly", location.isDogFriendly)}
                {renderBoolField("Camping", location.isCampingAllowed)}
              </div>
            </>
          )}

          {location.photos.length > 1 && (
            <>
              <Separator className="opacity-50" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  Photos ({location.photos.length})
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {location.photos.slice(0, 6).map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-border/50"
                    >
                      <Image src={photo.url} alt={photo.caption ?? ""} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {location.visits.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Visits ({location.visits.length})
                </p>
                <div className="space-y-2">
                  {location.visits.slice(0, 3).map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-start gap-2 text-sm rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <span className="text-muted-foreground text-xs shrink-0 mt-0.5">
                        {format(new Date(visit.visitedAt), "MMM d, yyyy")}
                      </span>
                      {visit.rating && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {Array.from({ length: visit.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                      {visit.notes && (
                        <p className="text-xs text-muted-foreground flex-1 line-clamp-1">{visit.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {location.externalLinks.length > 0 && (
            <>
              <Separator className="opacity-50" />
              <div className="space-y-1.5">
                {location.externalLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline rounded-lg bg-primary/5 px-3 py-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </>
          )}

          <p className="text-[11px] text-muted-foreground pb-2">
            Added {format(new Date(location.createdAt), "MMM d, yyyy")}
            {location.updatedAt > location.createdAt &&
              ` · Updated ${format(new Date(location.updatedAt), "MMM d, yyyy")}`}
          </p>
        </div>
      </ScrollArea>

      <NavigateShareDialog
        location={coordsPayload}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      <DbShareDialog
        open={dbShareOpen}
        onOpenChange={setDbShareOpen}
        locationId={locationId}
        title={location.title}
      />

      <AddToCollectionDialog
        locationId={locationId}
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
      />

      <AddToTripDialog
        locationId={locationId}
        open={tripOpen}
        onOpenChange={setTripOpen}
      />

      {location && categories.length > 0 && (
        <EditLocationDialog
          location={location}
          open={editOpen}
          onOpenChange={setEditOpen}
          categories={categories}
          onUpdated={() => {
            getLocationById(locationId).then(setLocation);
          }}
        />
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  active,
  activeClass,
  title,
  className,
  asChild,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  activeClass?: string;
  title?: string;
  className?: string;
  asChild?: boolean;
}) {
  if (asChild) {
    return (
      <Button variant="ghost" size="icon-sm" title={title} className={cn("rounded-xl", className)} asChild>
        {children as React.ReactElement}
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      title={title}
      className={cn("rounded-xl", active && activeClass, className)}
    >
      {children}
    </Button>
  );
}

function renderBoolField(label: string, value: boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center gap-2 text-xs rounded-lg bg-muted/30 px-2.5 py-2">
      <span className={cn("h-2 w-2 rounded-full shrink-0", value ? "bg-primary" : "bg-muted-foreground/30")} />
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold ms-auto", value ? "text-primary" : "text-muted-foreground")}>
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}
