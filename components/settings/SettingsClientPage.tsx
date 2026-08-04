"use client";

import { useTheme } from "next-themes";
import { useSettingsStore } from "@/lib/store/settings";
import { updateUserPreferences, exportAllUserData, deleteAccount } from "@/lib/actions/settings";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Map, Palette, Shield, Loader2, Languages, Trash2, AlertTriangle } from "lucide-react";
import { ImportSection } from "@/components/settings/ImportSection";
import { DriveBackupSection } from "@/components/settings/DriveBackupSection";
import { TrashSection } from "@/components/settings/TrashSection";
import { ActiveSharesSection } from "@/components/settings/ActiveSharesSection";
import { DuplicatesSection } from "@/components/settings/DuplicatesSection";
import { CategorySettingsSection } from "@/components/settings/CategorySettingsSection";
import { PushNotificationsSection } from "@/components/settings/PushNotificationsSection";
import { OpsHealthSection } from "@/components/settings/OpsHealthSection";
import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { toast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { MAP_STYLES as STYLE_DEFS } from "@/lib/map/types";

type Prefs = Awaited<ReturnType<typeof import("@/lib/actions/settings").getUserPreferences>>;

type Category = { id: string; name: string; color: string; icon: string; isSystem: boolean };

interface Props {
  initialPrefs: Prefs;
  categories?: Category[];
}

export function SettingsClientPage({ initialPrefs, categories = [] }: Props) {
  const t = useTranslations("settings");
  const tm = useTranslations("map");
  const { theme, setTheme } = useTheme();
  const { mapProvider, mapStyle, setMapProvider, setMapStyle } = useSettingsStore();
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  async function savePrefs(updates: Record<string, string>) {
    try {
      await updateUserPreferences(updates);
      toast({ title: t("settingsSaved"), variant: "success" });
    } catch {
      toast({ title: t("settingsFailed"), variant: "destructive" });
    }
  }

  function handleProviderChange(p: "mapbox" | "google" | "leaflet") {
    setMapProvider(p);
    setMapStyle(STYLE_DEFS[p][0].id);
    savePrefs({ mapProvider: p.toUpperCase() as "MAPBOX" | "GOOGLE" | "LEAFLET" });
  }

  function handleThemeChange(t2: string) {
    setTheme(t2);
    savePrefs({ theme: t2 });
  }

  async function handleFullExport() {
    setExportingAll(true);
    try {
      const data = await exportAllUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hiddenspots-gdpr-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: data.truncated ? t("fullExportTruncated") : t("fullExportDownloaded"),
        variant: data.truncated ? "default" : "success",
      });
    } catch (e) {
      const msg = e instanceof Error && e.message === "RATE_LIMITED" ? t("exportRateLimited") : t("exportFailed");
      toast({ title: msg, variant: "destructive" });
    } finally {
      setExportingAll(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount(deleteEmail);
      toast({ title: t("deleteAccountDeleted"), variant: "success" });
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport(format: "geojson" | "gpx" | "kml" | "csv") {
    setExporting(true);
    try {
      const res = await fetch("/api/export?format=" + format);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "geojson" ? "json" : format;
      a.download = `hiddenspots-export.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("exportDownloaded"), variant: "success" });
    } catch {
      toast({ title: t("exportFailed"), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  const groups = [
    { id: "field", label: t("groupField") },
    { id: "backup", label: t("groupBackup") },
    { id: "sharing", label: t("groupSharing") },
    { id: "advanced", label: t("groupAdvanced") },
  ] as const;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <PageHeader title={t("title")} description={initialPrefs?.email ?? ""} />

      <nav
        className="sticky top-0 z-20 border-b border-border/40 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-2"
        aria-label={t("jumpToSection")}
      >
        <div className="max-w-xl flex gap-2 overflow-x-auto scrollbar-hide" role="list">
          {groups.map((g) => (
            <a
              key={g.id}
              href={`#settings-${g.id}`}
              role="listitem"
              className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border border-border/50 bg-card/80 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              {g.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="p-4 sm:p-6 max-w-xl space-y-6">
        <h2 id="settings-field" className="text-xs font-bold uppercase tracking-wide text-muted-foreground scroll-mt-16">
          {t("groupField")}
        </h2>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Map className="h-4 w-4 text-primary" /> {t("map")}
          </div>
          <div className="space-y-2">
            <Label>{t("mapProvider")}</Label>
            <Select value={mapProvider} onValueChange={(v) => handleProviderChange(v as "mapbox" | "google" | "leaflet")}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mapbox">{t("mapProviderMapbox")}</SelectItem>
                <SelectItem value="google">{t("mapProviderGoogle")}</SelectItem>
                <SelectItem value="leaflet">{t("mapProviderLeaflet")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("mapStyle")}</Label>
            <Select value={mapStyle} onValueChange={(v) => { setMapStyle(v); savePrefs({ mapStyle: v }); }}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_DEFS[mapProvider]?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {tm(`styles.${s.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Palette className="h-4 w-4 text-primary" /> {t("appearance")}
          </div>
          <div className="space-y-2">
            <Label>{t("theme")}</Label>
            <Select value={theme ?? "system"} onValueChange={handleThemeChange}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("themeLight")}</SelectItem>
                <SelectItem value="dark">{t("themeDark")}</SelectItem>
                <SelectItem value="system">{t("themeSystem")}</SelectItem>
                <SelectItem value="sun">{t("themeSun")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("fontSize")}</Label>
            <Select
              defaultValue={initialPrefs?.fontSize ?? "default"}
              onValueChange={(v) => savePrefs({ fontSize: v })}
            >
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("fontDefault")}</SelectItem>
                <SelectItem value="large">{t("fontLarge")}</SelectItem>
                <SelectItem value="xl">{t("fontXl")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Shield className="h-4 w-4 text-primary" /> {t("privacy")}
          </div>
          <div className="space-y-2">
            <Label>{t("defaultPrivacyLabel")}</Label>
            <Select
              defaultValue={initialPrefs?.defaultPrivacy ?? "PRIVATE"}
              onValueChange={(v) => savePrefs({ defaultPrivacy: v })}
            >
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">{t("privacyPrivate")}</SelectItem>
                <SelectItem value="SHARED">{t("privacyShared")}</SelectItem>
                <SelectItem value="PUBLIC">{t("privacyPublic")}</SelectItem>
                <SelectItem value="SECRET">{t("privacySecret")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Languages className="h-4 w-4 text-primary" /> {t("language")}
          </div>
          <LocaleSwitcher />
        </section>

        <h2 id="settings-backup" className="text-xs font-bold uppercase tracking-wide text-muted-foreground scroll-mt-16 pt-2">
          {t("groupBackup")}
        </h2>

        <ImportSection />

        <DriveBackupSection />

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Download className="h-4 w-4 text-primary" /> {t("exportData")}
          </div>
          <p className="text-sm text-muted-foreground">{t("exportDescription")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" disabled={exporting} onClick={() => handleExport("geojson")}>
              {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
              GeoJSON
            </Button>
            <Button variant="outline" className="rounded-xl" disabled={exporting} onClick={() => handleExport("gpx")}>
              GPX
            </Button>
            <Button variant="outline" className="rounded-xl" disabled={exporting} onClick={() => handleExport("kml")}>
              KML
            </Button>
            <Button variant="outline" className="rounded-xl" disabled={exporting} onClick={() => handleExport("csv")}>
              CSV
            </Button>
            <Button variant="outline" className="rounded-xl" disabled={exportingAll} onClick={handleFullExport}>
              {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("fullExportLabel")}
            </Button>
          </div>
        </section>

        <h2 id="settings-sharing" className="text-xs font-bold uppercase tracking-wide text-muted-foreground scroll-mt-16 pt-2">
          {t("groupSharing")}
        </h2>

        <ActiveSharesSection />

        <TrashSection />

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <DuplicatesSection />
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <CategorySettingsSection categories={categories} />
        </section>

        <h2 id="settings-advanced" className="text-xs font-bold uppercase tracking-wide text-muted-foreground scroll-mt-16 pt-2">
          {t("groupAdvanced")}
        </h2>

        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <PushNotificationsSection />
        </section>

        <OpsHealthSection />

        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-destructive">
            <Trash2 className="h-4 w-4" /> {t("deleteAccount")}
          </div>
          <p className="text-sm text-muted-foreground">{t("deleteAccountDescription")}</p>
          {!deleteOpen ? (
            <Button
              variant="outline"
              className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => { setDeleteOpen(true); setTimeout(() => deleteInputRef.current?.focus(), 50); }}
            >
              <Trash2 className="h-4 w-4" /> {t("deleteAccountButton")}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">{t("deleteAccountWarning")}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("deleteAccountConfirmLabel")}</Label>
                <Input
                  ref={deleteInputRef}
                  type="email"
                  placeholder={initialPrefs?.email ?? ""}
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => { setDeleteOpen(false); setDeleteEmail(""); }}>
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  disabled={deleting || !deleteEmail}
                  onClick={handleDeleteAccount}
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("deleteAccountPermanent")}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
