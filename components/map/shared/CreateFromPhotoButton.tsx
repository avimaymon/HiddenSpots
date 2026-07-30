"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { readJpegGps } from "@/lib/media/read-jpeg-gps";
import { useMapStore } from "@/lib/store/map";

interface Props {
  onReady: (coords: { lat: number; lng: number }, file: File) => void;
  className?: string;
}

export function CreateFromPhotoButton({ onReady, className }: Props) {
  const t = useTranslations("map");
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const startAddingLocation = useMapStore((s) => s.startAddingLocation);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const gps = readJpegGps(buf);
      if (!gps) {
        toast({ title: t("exifNoGps"), variant: "destructive" });
        return;
      }
      startAddingLocation(gps);
      onReady(gps, file);
      toast({ title: t("exifGpsReady"), variant: "success" });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        title={t("createFromPhoto")}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        <span className="hidden sm:inline">{t("createFromPhoto")}</span>
      </Button>
    </>
  );
}
