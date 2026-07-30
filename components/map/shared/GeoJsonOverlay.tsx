"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  onDataChange: (data: GeoJSON.FeatureCollection | null) => void;
  hasData: boolean;
}

export function GeoJsonOverlayButton({ onDataChange, hasData }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as GeoJSON.FeatureCollection;
        if (!parsed.features) throw new Error("Invalid GeoJSON");
        onDataChange(parsed);
        toast({ title: `Loaded ${parsed.features.length} features`, variant: "success" });
      } catch {
        toast({ title: "Invalid GeoJSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".geojson,.json" className="hidden" onChange={handleFile} />
      {hasData ? (
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onDataChange(null)}
          className="rounded-xl h-9 w-9"
          title="Remove GeoJSON overlay"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => fileRef.current?.click()}
          className="rounded-xl h-9 w-9"
          title="Load GeoJSON overlay"
        >
          <Upload className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
