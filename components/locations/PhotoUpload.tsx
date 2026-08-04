"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, WifiOff } from "lucide-react";
import Image from "next/image";
import { storePhotoBlob } from "@/lib/offline/db";
import { generateBlurHash } from "@/lib/media/blurhash-client";
import { useTranslations } from "next-intl";

interface Props {
  onUploadComplete: (url: string, blurHash?: string) => void;
  /** When creating a location, collect files for upload after the row exists. */
  onFilesSelected?: (files: File[]) => void;
  locationId?: string;
  multiple?: boolean;
  existingPhotos?: { url: string; id: string }[];
  onRemove?: (id: string) => void;
}

export function PhotoUpload({
  onUploadComplete,
  onFilesSelected,
  locationId,
  multiple = true,
  existingPhotos = [],
  onRemove,
}: Props) {
  const t = useTranslations("locations");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; uploading: boolean; queued?: boolean }[]>(
    []
  );

  async function handleFiles(files: FileList) {
    const fileArray = Array.from(files);
    const newPreviews = fileArray.map((f) => ({ url: URL.createObjectURL(f), uploading: true }));
    setPreviews((p) => [...p, ...newPreviews]);
    setUploading(true);
    const baseLen = previews.length;

    // No location yet — keep files for the parent to upload after create
    if (!locationId) {
      onFilesSelected?.(fileArray);
      for (let i = 0; i < fileArray.length; i++) {
        onUploadComplete(newPreviews[i].url);
        setPreviews((p) =>
          p.map((prev, idx) =>
            idx === baseLen + i ? { ...prev, uploading: false } : prev
          )
        );
      }
      setUploading(false);
      return;
    }

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      if (!navigator.onLine) {
        try {
          await storePhotoBlob({ locationId, file, isPrimary: i === 0 });
          onUploadComplete(newPreviews[i].url);
          setPreviews((p) =>
            p.map((prev, idx) =>
              idx === baseLen + i ? { ...prev, uploading: false, queued: true } : prev
            )
          );
        } catch {
          setPreviews((p) =>
            p.map((prev, idx) =>
              idx === baseLen + i ? { ...prev, uploading: false } : prev
            )
          );
        }
        continue;
      }

      const blurHash = await generateBlurHash(file);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("locationId", locationId);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = (await res.json()) as { url: string };
        onUploadComplete(url, blurHash ?? undefined);
        setPreviews((p) =>
          p.map((prev, idx) =>
            idx === baseLen + i ? { ...prev, uploading: false, url } : prev
          )
        );
      } else {
        setPreviews((p) =>
          p.map((prev, idx) =>
            idx === baseLen + i ? { ...prev, uploading: false } : prev
          )
        );
      }
    }
    setUploading(false);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t("photoDropHint")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("photoFormatsHint")}</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />

      {(existingPhotos.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
              {/* 4-column grid of square thumbs. */}
              <Image src={photo.url} alt="" fill sizes="25vw" className="object-cover" />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  aria-label={t("removePhoto")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={p.url} alt="" fill unoptimized sizes="25vw" className="object-cover" />
              {p.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
              {p.queued && (
                <div
                  className="absolute inset-0 bg-amber-900/60 flex items-center justify-center"
                  title={t("photoQueued")}
                >
                  <WifiOff className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Upload a local file bound to an owned locationId. */
export async function uploadLocationPhotoFile(
  file: File,
  locationId: string
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("locationId", locationId);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = (await res.json()) as { url: string };
  return url;
}
