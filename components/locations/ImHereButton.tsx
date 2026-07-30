"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createVisit, addVisitPhoto } from "@/lib/actions/visits";
import { toast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getDistanceBetween, formatDistance, cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

interface Props {
  locationId: string;
  latitude: number;
  longitude: number;
  onLogged?: () => void;
  className?: string;
  /** Max distance (m) before we warn but still allow */
  warnBeyondM?: number;
}

async function uploadPhoto(file: File, locationId: string): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("locationId", locationId);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const json = (await res.json()) as { url: string };
  return json.url;
}

export function ImHereButton({
  locationId,
  latitude,
  longitude,
  onLogged,
  className,
  warnBeyondM = 500,
}: Props) {
  const t = useTranslations("visits");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { latitude: lat, longitude: lng, refresh } = useGeolocation(true);

  const dist =
    lat != null && lng != null
      ? getDistanceBetween(lat, lng, latitude, longitude)
      : null;

  function onPickPhoto(file: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleClick() {
    startTransition(async () => {
      try {
        if (lat == null || lng == null) await refresh();
        const visit = await createVisit({
          locationId,
          visitedAt: new Date().toISOString(),
        });
        if (photoFile) {
          try {
            const url = await uploadPhoto(photoFile, locationId);
            await addVisitPhoto(visit.id, url);
          } catch {
            toast({ title: t("photoUploadFailed"), variant: "destructive" });
          }
        }
        setDone(true);
        track("visit", { method: "im_here", withPhoto: Boolean(photoFile) });
        toast({
          title: t("logged"),
          description: dist != null ? formatDistance(dist) : undefined,
          variant: "success",
        });
        onPickPhoto(null);
        onLogged?.();
      } catch {
        toast({ title: t("logFailed"), variant: "destructive" });
      }
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
      />

      {photoPreview && !done && (
        <div className="relative h-24 w-full rounded-xl overflow-hidden bg-muted">
          <Image src={photoPreview} alt="" fill className="object-cover" />
          <button
            type="button"
            className="absolute top-1 end-1 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center"
            onClick={() => onPickPhoto(null)}
            aria-label={t("removePhoto")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isPending || done}
          className="h-12 w-12 shrink-0 rounded-xl"
          onClick={() => fileRef.current?.click()}
          aria-label={t("addPhotoOptional")}
        >
          <Camera className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          onClick={handleClick}
          disabled={isPending || done}
          className="flex-1 rounded-xl h-12 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          {done ? t("imHereDone") : photoFile ? t("imHereWithPhoto") : t("imHere")}
        </Button>
      </div>
      {dist != null && dist > warnBeyondM && !done && (
        <p className="text-[11px] text-amber-600 text-center">
          {t("imHereFar", { distance: formatDistance(dist) })}
        </p>
      )}
    </div>
  );
}
