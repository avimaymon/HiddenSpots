"use client";

import { useState } from "react";
import Image from "next/image";
import { Drawer } from "vaul";
import { MapPin, Loader2, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createLocation, addLocationPhoto, findNearbyDuplicates } from "@/lib/actions/locations";
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
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spark, setSpark] = useState(false);

  function reset() {
    setTitle("");
    setCategoryId("");
    setPhotoUrl(null);
    setSpark(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setPhotoUrl(url);
      }
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim() || !coords) return;
    setSaving(true);
    try {
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
      const loc = await createLocation({
        title: title.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        privacy: "PRIVATE",
        isFavorite: false,
        isBucketList: false,
        fuzzyCoordinates: false,
        recommendedSeasons: [],
        externalLinks: [],
        categoryId: categoryId || undefined,
      });
      if (photoUrl) await addLocationPhoto(loc.id, photoUrl, true);
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
        coverPhotoUrl: photoUrl,
        categoryId: loc.categoryId,
        category: loc.category
          ? { color: loc.category.color, icon: loc.category.icon, name: loc.category.name }
          : null,
        photos: photoUrl ? [{ url: photoUrl }] : [],
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
                    photoUrl ? "border-primary/50 bg-primary/5" : "hover:border-primary/50"
                  )}
                >
                  {photoUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : photoUrl ? (
                    <Image src={photoUrl} alt="" fill unoptimized className="object-cover rounded-xl" />
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
