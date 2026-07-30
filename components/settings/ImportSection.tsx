"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseImportFile } from "@/lib/geo/import";
import { importLocations } from "@/lib/actions/import";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

export function ImportSection() {
  const t = useTranslations("import-export");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof parseImportFile>> | null>(null);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleFile(file: File) {
    setParsing(true);
    setPreview(null);
    try {
      const result = await parseImportFile(file);
      setPreview(result);
      if (result.count === 0) {
        toast({ title: t("noLocationsFound"), description: result.errors[0], variant: "destructive" });
      }
    } catch (e) {
      toast({ title: t("parseFailed"), description: String(e), variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!preview?.locations.length) return;
    setImporting(true);
    try {
      const { created, skipped, errors } = await importLocations(preview.locations);
      toast({
        title: t("importedCount", { count: created }),
        description: [
          skipped > 0 ? t("duplicatesSkipped", { count: skipped }) : null,
          errors.length ? t("errorsCount", { count: errors.length }) : null,
        ].filter(Boolean).join(" · ") || undefined,
        variant: created > 0 ? "success" : "destructive",
      });
      if (created > 0) {
        setPreview(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (e) {
      toast({ title: t("importFailed"), description: String(e), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Upload className="h-4 w-4 text-primary" /> {t("importTitle")}
      </div>
      <p className="text-sm text-muted-foreground">{t("importDescription")}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".geojson,.json,.gpx,.kml,.kmz,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <Button
        variant="outline"
        className="rounded-xl"
        disabled={parsing}
        onClick={() => inputRef.current?.click()}
      >
        {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
        {t("chooseFile")}
      </Button>

      {preview && preview.count > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t("found", { count: preview.count, source: preview.source })}
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {preview.locations.slice(0, 10).map((l, i) => (
              <li key={i} className="truncate">
                {l.title} — {l.latitude?.toFixed(4)}, {l.longitude?.toFixed(4)}
              </li>
            ))}
            {preview.count > 10 && <li>{t("andMore", { count: preview.count - 10 })}</li>}
          </ul>
          {preview.errors.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {preview.errors.join("; ")}
            </div>
          )}
          <Button className="rounded-xl w-full" onClick={handleImport} disabled={importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("importSpots", { count: preview.count })}
          </Button>
        </div>
      )}
    </section>
  );
}
