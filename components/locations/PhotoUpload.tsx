"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  onUploadComplete: (url: string) => void;
  multiple?: boolean;
  existingPhotos?: { url: string; id: string }[];
  onRemove?: (id: string) => void;
}

export function PhotoUpload({ onUploadComplete, multiple = true, existingPhotos = [], onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; uploading: boolean }[]>([]);

  async function handleFiles(files: FileList) {
    const fileArray = Array.from(files);
    const newPreviews = fileArray.map((f) => ({
      url: URL.createObjectURL(f),
      uploading: true,
    }));
    setPreviews((p) => [...p, ...newPreviews]);
    setUploading(true);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        onUploadComplete(url);
        setPreviews((p) =>
          p.map((prev, idx) =>
            idx === previews.length + i ? { ...prev, uploading: false, url } : prev
          )
        );
      }
    }
    setUploading(false);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Drop photos or click to upload</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP up to 10MB</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
      />

      {/* Preview grid */}
      {(existingPhotos.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
              <Image src={photo.url} alt="" fill className="object-cover" />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={p.url} alt="" fill className="object-cover" />
              {p.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
