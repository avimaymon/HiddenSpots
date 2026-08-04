"use client";

import { useState } from "react";
import Image from "next/image";
import { Drawer } from "vaul";
import { MapPin, Loader2, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createLocation, addLocationPhoto, findNearbyDuplicates } from "@/lib/actions/locations";
import { uploadLocationPhotoFile } from "@/components/locations/PhotoUpload";
import { cacheLocationsForOffline, enqueueSync } from "@/lib/offline/db";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { SparkBurst } from "@/components/effects/SparkBurst";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coords: { lat: number; lng: number } | null;
  categories: { id: string; name: string; color: string }[];
  onCreated: (loc: {
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
  }) => void;
}

export function QuickAddSheet({ open, onOpenChange, coords, categories, onCreated }: Props) {
  const t = useTranslations("locations");
  const tc = useTranslations("common");
  const tm = useTranslations("map");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [spark, setSpark] = useState(false);

  function reset() {
    setTitle("");
    setCategoryId("");
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setSpark(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!title.trim() || !coords) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        privacy: "PRIVATE" as const,
        isFavorite: false,
        isBucketList: false,
        fuzzyCoordinates: false,
        recommendedSeasons: [] as string[],
        externalLinks: [] as string[],
        categoryId: categoryId || undefined,
      };

      if (!navigator.onLine) {
        const clientId = crypto.randomUUID();
        await enqueueSync("create", { ...payload, clientId });
        const cat = categories.find((c) => c.id === categoryId);
        const optimistic = {
          id: clientId,
          title: payload.title,
          latitude: payload.latitude,
          longitude: payload.longitude,
          isFavorite: false,
          isVisited: false,
          coverPhotoUrl: null as string | null,
          categoryId: categoryId || null,
          category: cat
            ? { color: cat.color, icon: "map-pin", name: cat.name }
            : null,
          photos: [] as { url: string }[],
        };
        await cacheLocationsForOffline([
          {
            id: optimistic.id,
            title: optimistic.title,
            latitude: optimistic.latitude,
            longitude: optimistic.longitude,
            category: optimistic.category,
            isFavorite: false,
            isVisited: false,
            coverPhotoUrl: null,
          },
        ]);
        onCreated(optimistic);
        setSpark(true);
        toast({ title: t("savedOffline"), variant: "success" });
        window.setTimeout(() => {
          reset();
          onOpenChange(false);
        }, 420);
        return;
      }

      const dups = await findNearbyDuplicates({
        title: title.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
      });
      if (dups.length > 0) {
        const ok = confirm(t("duplicateWarn", { name: dups[0].title, count: dups.length }));
        if (!ok) {
          setSaving(false);
          return;
        }
      }
      const loc = await createLocation(payload);
      let coverUrl: string | null = null;
      if (photoFile) {
        coverUrl = await uploadLocationPhotoFile(photoFile, loc.id);
        await addLocationPhoto(loc.id, coverUrl, true);
      }
      const { markHasSavedSpot } = await import("@/lib/pwa/first-spot");
      markHasSavedSpot();
      setSpark(true);
      toast({ title: t("savedTitle"), variant: "success" });
      onCreated({
        id: loc.id,
        title: loc.title,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isFavorite: loc.isFavorite,
        isVisited: loc.isVisited,
        coverPhotoUrl: coverUrl,
        categoryId: loc.categoryId,
        category: loc.category
          ? { color: loc.category.color, icon: loc.category.icon, name: loc.category.name }
          : null,
        photos: coverUrl ? [{ url: coverUrl }] : [],
      });
      window.setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 420);
    } catch {
      toast({ title: t("saveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-border/60 glass-strong shadow-float overflow-hidden"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), var(--keyboard-height, 0px))",
          }}
        >
          {/* Visually hidden: without it this announces as an unnamed dialog. */}
          <Drawer.Title className="sr-only">{tm("sheetQuickAddTitle")}</Drawer.Title>
          <div className="relative">
            <SparkBurst active={spark} />
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/25 shrink-0" />

            <div className="px-4 pt-3 pb-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t("quickAddTitle")}</p>
                  {coords && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Input
                autoFocus
                placeholder={t("namePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="h-12 text-base rounded-xl"
              />

              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {categories.slice(0, 8).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id === categoryId ? "" : cat.id)}
                      className={cn(
                        "flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-all",
                        cat.id === categoryId
                          ? "text-white border-transparent"
                          : "border-border/50 bg-background text-foreground"
                      )}
                      style={
                        cat.id === categoryId
                          ? { background: cat.color, borderColor: cat.color }
                          : {}
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                          background: cat.id === categoryId ? "rgba(255,255,255,0.7)" : cat.color,
                        }}
                      />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <label
                  className={cn(
                    "relative flex items-center justify-center gap-2 h-12 w-12 rounded-xl border-2 border-dashed border-border cursor-pointer shrink-0 transition-colors overflow-hidden",
                    photoPreview ? "border-primary/50 bg-primary/5" : "hover:border-primary/50"
                  )}
                >
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt=""
                      fill
                      unoptimized
                      sizes="96px"
                      className="object-cover rounded-xl"
                    />
                  ) : (
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>

                <Button
                  onClick={handleSave}
                  disabled={!title.trim() || saving || !coords}
                  className="flex-1 h-12 rounded-xl text-base font-semibold fab-nature border-0 text-primary-foreground"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : tc("save")}
                </Button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
