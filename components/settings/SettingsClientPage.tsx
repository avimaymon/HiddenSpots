"use client";

import { useTheme } from "next-themes";
import { useSettingsStore } from "@/lib/store/settings";
import { updateUserPreferences } from "@/lib/actions/settings";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, Map, Palette, Shield, Loader2, Languages } from "lucide-react";
import { ImportSection } from "@/components/settings/ImportSection";
import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
type Prefs = Awaited<ReturnType<typeof import("@/lib/actions/settings").getUserPreferences>>;

const MAP_STYLES: Record<string, string[]> = {
  mapbox: ["outdoors-v12", "satellite-streets-v12", "light-v11", "dark-v11"],
  google: ["roadmap", "satellite", "terrain"],
  leaflet: ["osm", "satellite", "topo"],
};

interface Props {
  initialPrefs: Prefs;
}

export function SettingsClientPage({ initialPrefs }: Props) {
  const { theme, setTheme } = useTheme();
  const { mapProvider, mapStyle, setMapProvider, setMapStyle } = useSettingsStore();
  const [exporting, setExporting] = useState(false);

  async function savePrefs(updates: Record<string, string>) {
    try {
      await updateUserPreferences(updates);
      toast({ title: "Settings saved", variant: "success" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  function handleProviderChange(p: "mapbox" | "google" | "leaflet") {
    setMapProvider(p);
    setMapStyle(MAP_STYLES[p][0]);
    savePrefs({ mapProvider: p.toUpperCase() as "MAPBOX" | "GOOGLE" | "LEAFLET" });
  }

  function handleThemeChange(t: string) {
    setTheme(t);
    savePrefs({ theme: t });
  }

  async function handleExport(format: "geojson" | "gpx") {
    setExporting(true);
    try {
      const res = await fetch("/api/export?format=" + format);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hiddenspots-export.${format === "geojson" ? "json" : "gpx"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded", variant: "success" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <PageHeader title="Settings" description={initialPrefs?.email ?? ""} />

      <div className="p-4 sm:p-6 max-w-xl space-y-6">
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Map className="h-4 w-4 text-primary" /> Map
          </div>
          <div className="space-y-2">
            <Label>Map provider</Label>
            <Select value={mapProvider} onValueChange={(v) => handleProviderChange(v as "mapbox" | "google" | "leaflet")}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mapbox">Mapbox (recommended)</SelectItem>
                <SelectItem value="google">Google Maps</SelectItem>
                <SelectItem value="leaflet">OpenStreetMap / Leaflet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Map style</Label>
            <Select value={mapStyle} onValueChange={(v) => { setMapStyle(v); savePrefs({ mapStyle: v }); }}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAP_STYLES[mapProvider]?.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Palette className="h-4 w-4 text-primary" /> Appearance
          </div>
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme ?? "system"} onValueChange={handleThemeChange}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Shield className="h-4 w-4 text-primary" /> Privacy
          </div>
          <div className="space-y-2">
            <Label>Default privacy for new spots</Label>
            <Select
              defaultValue={initialPrefs?.defaultPrivacy ?? "PRIVATE"}
              onValueChange={(v) => savePrefs({ defaultPrivacy: v })}
            >
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="SHARED">Shared</SelectItem>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="SECRET">Secret (fuzzy location)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Languages className="h-4 w-4 text-primary" /> Language
          </div>
          <LocaleSwitcher />
        </section>

        <ImportSection />

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Download className="h-4 w-4 text-primary" /> Export Data
          </div>
          <p className="text-sm text-muted-foreground">Download all your spots for backup or use in other apps</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" disabled={exporting} onClick={() => handleExport("geojson")}>
              {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
              GeoJSON
            </Button>
            <Button variant="outline" className="rounded-xl" disabled={exporting} onClick={() => handleExport("gpx")}>
              GPX
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
