"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getLocationById, toggleFavorite, toggleBucketList, deleteLocation } from "@/lib/actions/locations";
import {
  dropSyncItemsMatchingClientId,
  enqueueSync,
  getOfflineLocation,
  patchCachedLocation,
  patchPendingCreatePayload,
  removeOfflineLocation,
  type CachedLocation,
} from "@/lib/offline/db";
import { isPendingOfflineId } from "@/lib/offline/pending";
import type { LocationFormData } from "@/lib/validations/schemas";
import { Input } from "@/components/ui/input";
import { EditLocationDialog } from "@/components/locations/EditLocationDialog";
import { AddToCollectionDialog } from "@/components/locations/AddToCollectionDialog";
import { AddToTripDialog } from "@/components/locations/AddToTripDialog";
import { NavigateShareDialog } from "@/components/shared/NavigateShareDialog";
import { DbShareDialog } from "@/components/shared/DbShareDialog";
import { LogVisitDialog } from "@/components/visits/LogVisitDialog";
import { ImHereButton } from "@/components/locations/ImHereButton";
import { QuickNavButtons } from "@/components/shared/QuickNavButtons";
import { useGeolocation } from "@/hooks/use-geolocation";
import { copyToClipboard } from "@/lib/navigation/external-links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Heart, Bookmark, Eye, Edit2, Trash2, MapPin, Star,
  Camera, ExternalLink, Navigation, Share2, Copy, Check, Footprints,
  FolderPlus, Route, AlertTriangle, Lightbulb,
} from "lucide-react";
import Image from "next/image";
import { cn, escapeHtml, formatLocalizedDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SolarInfoCard } from "@/components/locations/SolarInfoCard";
import { ExternalMapsButtons } from "@/components/locations/ExternalMapsButtons";
import { AirQualityCard } from "@/components/locations/AirQualityCard";
import { NearestParking } from "@/components/locations/NearestParking";
import { LocationHistoryTimeline } from "@/components/locations/LocationHistoryTimeline";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  locationId: string;
  onClose: () => void;
  onDeleted?: (locationId: string) => void;
  onPatched?: (
    locationId: string,
    patch: { title?: string; latitude?: number; longitude?: number }
  ) => void;
  categories?: { id: string; name: string; color: string; icon: string }[];
}

type LocationDetail = Awaited<ReturnType<typeof getLocationById>>;

export function LocationDetailPanel({
  locationId,
  onClose,
  onDeleted,
  onPatched,
  categories = [],
}: Props) {
  const t = useTranslations("locations");
  const tv = useTranslations("visits");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pendingOffline = isPendingOfflineId(locationId);
  const [location, setLocation] = useState<LocationDetail>(null);
  const [pendingCached, setPendingCached] = useState<CachedLocation | null>(null);
  const [pendingTitle, setPendingTitle] = useState("");
  const [savingPendingTitle, setSavingPendingTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [dbShareOpen, setDbShareOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const { distanceTo } = useGeolocation(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setPendingCached(null);
    setLocation(null);
    if (isPendingOfflineId(locationId)) {
      void getOfflineLocation(locationId).then((cached) => {
        setPendingCached(cached ?? null);
        setPendingTitle(cached?.title ?? "");
        setLoading(false);
      });
      return;
    }
    getLocationById(locationId).then((loc) => {
      setLocation(loc);
      setLoading(false);
    });
  }, [locationId]);

  async function discardPending() {
    if (!confirm(t("discardPendingConfirm"))) return;
    await dropSyncItemsMatchingClientId(locationId);
    await removeOfflineLocation(locationId);
    toast({ title: t("discardPendingDone"), variant: "destructive" });
    onDeleted?.(locationId);
    onClose();
  }

  async function savePendingTitle() {
    const title = pendingTitle.trim();
    if (!title || title === pendingCached?.title) return;
    setSavingPendingTitle(true);
    try {
      const patched = await patchPendingCreatePayload(locationId, { title });
      if (!patched) {
        toast({ title: t("pendingRenameFailed"), variant: "destructive" });
        return;
      }
      await patchCachedLocation(locationId, { title });
      setPendingCached((c) => (c ? { ...c, title } : c));
      onPatched?.(locationId, { title });
      toast({ title: t("pendingRenameDone"), variant: "success" });
    } finally {
      setSavingPendingTitle(false);
    }
  }

  function applyOptimisticEdit(data: LocationFormData) {
    setLocation((l) =>
      l
        ? {
            ...l,
            title: data.title,
            latitude: data.latitude,
            longitude: data.longitude,
            description: data.description ?? null,
            address: data.address ?? null,
            altitude: data.altitude ?? null,
            isFavorite: data.isFavorite,
            isBucketList: data.isBucketList,
            privateNotes: data.privateNotes ?? null,
            tips: data.tips ?? null,
            accessibility: data.accessibility ?? null,
            hazardNote: data.hazardNote ?? null,
            recommendedSeasons: data.recommendedSeasons ?? [],
            vibes: data.vibes ?? [],
            privacy: data.privacy,
            fuzzyCoordinates: data.fuzzyCoordinates,
            categoryId: data.categoryId ?? null,
          }
        : l
    );
    onPatched?.(locationId, {
      title: data.title,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Skeleton className="h-52 w-full rounded-none" />
        <div className="p-4 space-y-3 flex-1">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <div className="pt-2 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (pendingOffline) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 shrink-0 bg-muted/20">
          <h2 className="font-bold text-base leading-tight truncate pe-2">
            {pendingCached?.title ?? t("pendingUntitled")}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-xl shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Badge variant="outline" className="rounded-full">
            {t("pendingSyncBadge")}
          </Badge>
          {pendingCached ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {pendingCached.latitude.toFixed(5)}, {pendingCached.longitude.toFixed(5)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("pendingMissingCache")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("pendingSyncHint")}</p>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="pending-title">
              {t("fieldName")}
            </label>
            <Input
              id="pending-title"
              value={pendingTitle}
              onChange={(e) => setPendingTitle(e.target.value)}
              className="h-11 rounded-xl"
              maxLength={200}
            />
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={
                savingPendingTitle ||
                !pendingTitle.trim() ||
                pendingTitle.trim() === (pendingCached?.title ?? "")
              }
              onClick={() => void savePendingTitle()}
            >
              {t("pendingRenameSave")}
            </Button>
          </div>
          <Button
            variant="destructive"
            className="w-full rounded-xl gap-2"
            onClick={() => void discardPending()}
          >
            <Trash2 className="h-4 w-4" />
            {t("discardPending")}
          </Button>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <MapPin className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">{t("notFound")}</p>
        <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
          {tc("close")}
        </Button>
      </div>
    );
  }

  const primaryPhoto = location.photos.find((p) => p.isPrimary) ?? location.photos[0];

  async function handleToggleFavorite() {
    const currently = location?.isFavorite ?? false;
    if (!navigator.onLine) {
      await enqueueSync(currently ? "unfavorite" : "favorite", { locationId });
      setLocation((l) => (l ? { ...l, isFavorite: !currently } : l));
      toast({ title: t("savedOffline"), variant: "success" });
      return;
    }
    const newVal = await toggleFavorite(locationId);
    setLocation((l) => (l ? { ...l, isFavorite: newVal } : l));
  }

  async function handleToggleBucketList() {
    const currently = location?.isBucketList ?? false;
    if (!navigator.onLine) {
      await enqueueSync("update", { locationId, isBucketList: !currently });
      setLocation((l) => (l ? { ...l, isBucketList: !currently } : l));
      toast({ title: t("savedOffline"), variant: "success" });
      return;
    }
    const newVal = await toggleBucketList(locationId);
    setLocation((l) => (l ? { ...l, isBucketList: newVal } : l));
  }

  async function handleDelete() {
    if (!confirm(t("deleteConfirm"))) return;
    if (!navigator.onLine) {
      await enqueueSync("delete", { locationId });
      toast({
        title: t("deleted"),
        description: t("savedOffline"),
        variant: "destructive",
      });
      onDeleted?.(locationId);
      onClose();
      return;
    }
    await deleteLocation(locationId);
    toast({
      title: t("deleted"),
      variant: "destructive",
      action: {
        label: tc("undo"),
        onClick: async () => {
          const { restoreLocation } = await import("@/lib/actions/locations");
          await restoreLocation(locationId);
          toast({ title: t("restored"), variant: "success" });
        },
      },
    });
    onDeleted?.(locationId);
    onClose();
  }

  function handleVisitLogged() {
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
  }

  async function handleCopyCoords() {
    const ok = await copyToClipboard(`${location!.latitude}, ${location!.longitude}`);
    if (ok) {
      setCopiedCoords(true);
      toast({ title: t("coordsCopied"), variant: "success" });
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
          title={t("actionFavorite")}
        >
          <Heart className={cn("h-4 w-4", location.isFavorite && "fill-current")} />
        </ActionBtn>
        <ActionBtn
          onClick={handleToggleBucketList}
          active={location.isBucketList}
          activeClass="text-amber-500 bg-amber-500/10"
          title={t("actionBucket")}
        >
          <Bookmark className={cn("h-4 w-4", location.isBucketList && "fill-current")} />
        </ActionBtn>
        <ActionBtn
          title={t("actionNavigateShare")}
          onClick={() => setShareOpen(true)}
          className="text-primary bg-primary/10"
        >
          <Navigation className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn
          title={tv("logVisit")}
          onClick={() => setVisitOpen(true)}
          className={cn(location.isVisited && "text-green-600 bg-green-500/10")}
        >
          <Footprints className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn title={t("actionAddCollection")} onClick={() => setCollectionOpen(true)}>
          <FolderPlus className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn title={t("actionAddTrip")} onClick={() => setTripOpen(true)}>
          <Route className="h-4 w-4" />
        </ActionBtn>
        <div className="flex-1" />
        <ActionBtn title={t("actionShareLink")} onClick={() => setDbShareOpen(true)}>
          <Share2 className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn title={t("actionEdit")} onClick={() => setEditOpen(true)}>
          <Edit2 className="h-4 w-4" />
        </ActionBtn>
        <ActionBtn title={t("actionDelete")} onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
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
                {t("visitedBadge")}
              </Badge>
            )}
            {location.isBucketList && (
              <Badge variant="warning">{t("actionBucket")}</Badge>
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

          {/* Hazard alert */}
          {location.hazardNote && (!location.hazardExpiresAt || new Date(location.hazardExpiresAt) > new Date()) && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-xs leading-relaxed">{location.hazardNote}</p>
            </div>
          )}

          {location.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {location.description}
            </p>
          )}

          {/* Tips */}
          {(location as { tips?: string | null }).tips && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 leading-relaxed">{(location as { tips?: string | null }).tips}</p>
            </div>
          )}

          {/* Quick navigate */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t("navigate")}
              </p>
              {distance && (
                <span className="text-xs font-semibold text-primary">{distance}</span>
              )}
            </div>
            <QuickNavButtons
              location={coordsPayload}
              size="md"
              onMore={() => setShareOpen(true)}
            />
            <ExternalMapsButtons latitude={location.latitude} longitude={location.longitude} title={location.title} />
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
              title={t("actionCopyCoords")}
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
                {renderBoolField(t("amenityParking"), location.hasParking, t("yes"), t("no"))}
                {renderBoolField(t("amenityWater"), location.hasWater, t("yes"), t("no"))}
                {renderBoolField(t("amenityShade"), location.hasShade, t("yes"), t("no"))}
                {renderBoolField(t("amenityFamily"), location.isFamilyFriendly, t("yes"), t("no"))}
                {renderBoolField(t("amenityDog"), location.isDogFriendly, t("yes"), t("no"))}
                {renderBoolField(t("amenityCamping"), location.isCampingAllowed, t("yes"), t("no"))}
              </div>
            </>
          )}

          {location.photos.length > 1 && (
            <>
              <Separator className="opacity-50" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {t("photos")} ({location.photos.length})
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
                  {t("visits")} ({location.visits.length})
                </p>
                <div className="space-y-2">
                  {location.visits.slice(0, 3).map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-start gap-2 text-sm rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <span className="text-muted-foreground text-xs shrink-0 mt-0.5">
                        {formatLocalizedDate(visit.visitedAt, "MMM d, yyyy", locale)}
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

          <SolarInfoCard latitude={location.latitude} longitude={location.longitude} />
          <AirQualityCard latitude={location.latitude} longitude={location.longitude} />
          <NearestParking latitude={location.latitude} longitude={location.longitude} />

          <LocationHistoryTimeline locationId={locationId} />

          <div className="flex flex-wrap gap-2 pb-1">
            <a
              href={`https://www.inaturalist.org/observations?lat=${location.latitude}&lng=${location.longitude}&radius=1&view=map`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-medium"
            >
              🌿 {t("inaturalistLink")}
            </a>
          </div>

          <div className="flex gap-2 pb-1">
            <button
              type="button"
              aria-label={t("printSpotCard")}
              onClick={() => {
                // ponytail: use window.print with a temporary printable DOM
                const win = window.open("", "_blank");
                if (!win) return;
                const title = escapeHtml(location.title);
                const desc = escapeHtml(location.description ?? "");
                const coords = escapeHtml(
                  `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                );
                win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
                  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 1rem; }
                  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
                  .meta { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }
                  .coords { font-family: monospace; background: #f5f5f5; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; }
                  @media print { body { margin: 0; } }
                </style></head><body>
                <h1>${title}</h1>
                <div class="meta">${desc}</div>
                <div class="coords">${coords}</div>
                <p style="margin-top:1rem;font-size:0.8rem;color:#888">HiddenSpots · ${escapeHtml(new Date().toLocaleDateString())}</p>
                <script>window.print();window.close();<\/script>
                </body></html>`);
                win.document.close();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-medium"
            >
              🖨️ {t("printSpotCard")}
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground pb-2">
            {t("addedOn", { date: formatLocalizedDate(location.createdAt, "MMM d, yyyy", locale) })}
            {location.updatedAt > location.createdAt &&
              ` · ${t("updatedOn", { date: formatLocalizedDate(location.updatedAt, "MMM d, yyyy", locale) })}`}
          </p>
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-md px-3 py-3 safe-area-pb z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <ImHereButton
          locationId={locationId}
          latitude={location.latitude}
          longitude={location.longitude}
          onLogged={handleVisitLogged}
        />
      </div>

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
        locationPrivacy={location.privacy}
        fuzzyCoordinates={location.fuzzyCoordinates}
        hasDescription={Boolean(location.description)}
        hasAddress={Boolean(location.address)}
        hasPhotos={location.photos.length > 0}
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
          onUpdated={(data) => {
            if (data) {
              applyOptimisticEdit(data);
              if (navigator.onLine) {
                getLocationById(locationId).then(setLocation);
              }
            } else {
              getLocationById(locationId).then(setLocation);
            }
          }}
        />
      )}

      <LogVisitDialog
        open={visitOpen}
        onOpenChange={setVisitOpen}
        locationId={locationId}
        latitude={location.latitude}
        longitude={location.longitude}
        onLogged={handleVisitLogged}
      />
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

function renderBoolField(
  label: string,
  value: boolean | null | undefined,
  yesLabel: string,
  noLabel: string
) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center gap-2 text-xs rounded-lg bg-muted/30 px-2.5 py-2">
      <span className={cn("h-2 w-2 rounded-full shrink-0", value ? "bg-primary" : "bg-muted-foreground/30")} />
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold ms-auto", value ? "text-primary" : "text-muted-foreground")}>
        {value ? yesLabel : noLabel}
      </span>
    </div>
  );
}
