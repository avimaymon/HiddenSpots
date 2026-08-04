"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Command } from "cmdk";
import {
  Map, List, FolderOpen, Route, LayoutDashboard, Settings,
  Plus, Footprints, Download, Upload, Search, MapPin, Loader2, Shuffle,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { searchLocationsQuick } from "@/lib/actions/locations";
import { parseHebrewQuery, hasNlFilters } from "@/lib/search/hebrew-nl";
import { useGeolocation } from "@/hooks/use-geolocation";

const PAGES = [
  { href: "/app", icon: Map, labelKey: "map" as const },
  { href: "/locations", icon: List, labelKey: "locations" as const },
  { href: "/collections", icon: FolderOpen, labelKey: "collections" as const },
  { href: "/trips", icon: Route, labelKey: "trips" as const },
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/visits", icon: Footprints, labelKey: "visits" as const },
  { href: "/settings", icon: Settings, labelKey: "settings" as const },
  { href: "/import", icon: Upload, labelKey: "import" as const },
];

type SearchResult = { id: string; title: string; category: { name: string; color: string } | null };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("nav");
  const tc = useTranslations("command");
  const { latitude: myLat, longitude: myLng } = useGeolocation(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Reset state in the event handler (onOpenChange), not an effect
  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) { setQuery(""); setResults([]); }
  }

  const nl = query.trim() ? parseHebrewQuery(query) : null;
  const nlActive = Boolean(nl && hasNlFilters(nl));

  useEffect(() => {
    const q = query.trim();
    // All state updates are inside startTransition (async), not synchronous
    startTransition(async () => {
      if (q.length < 2) { setResults([]); return; }
      const hits = await searchLocationsQuick(q, {
        lat: myLat ?? undefined,
        lng: myLng ?? undefined,
      });
      setResults(hits);
    });
  }, [query, myLat, myLng]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-lg rounded-2xl">
        <Command className="rounded-2xl" shouldFilter={false}>
          <div className="flex items-center border-b border-border/50 px-3">
            {isPending ? (
              <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={tc("placeholder")}
              className="flex-1 h-12 bg-transparent border-0 outline-none px-3 text-sm"
            />
          </div>
          {nlActive && nl && (
            <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border/40">
              <span className="text-[10px] text-muted-foreground self-center">{tc("nlHint")}</span>
              {nl.matched.map((m) => (
                <span
                  key={m}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
          <Command.List className="max-h-[60dvh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {tc("noResults")}
            </Command.Empty>

            {results.length > 0 && (
              <Command.Group heading={tc("spots")} className="text-xs text-muted-foreground px-2 py-1.5">
                {results.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={r.id}
                    onSelect={() => go(`/locations/${r.id}`)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer",
                      "aria-selected:bg-primary/10 aria-selected:text-primary"
                    )}
                  >
                    <div
                      className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center"
                      style={{ background: r.category?.color ?? "#22c55e" }}
                    >
                      <MapPin className="h-2.5 w-2.5 text-white" />
                    </div>
                    <span className="flex-1 truncate">{r.title}</span>
                    {r.category && (
                      <span className="text-[10px] text-muted-foreground shrink-0">{r.category.name}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading={tc("navigation")} className="text-xs text-muted-foreground px-2 py-1.5">
              {PAGES.map(({ href, icon: Icon, labelKey }) => (
                <Command.Item
                  key={href}
                  value={t(labelKey)}
                  onSelect={() => go(href)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer",
                    "aria-selected:bg-primary/10 aria-selected:text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey)}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading={tc("actions")} className="text-xs text-muted-foreground px-2 py-1.5 mt-1">
              <Command.Item
                value={`${t("addSpot")} add spot location`}
                onSelect={() => go("/app")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-primary/10"
              >
                <Plus className="h-4 w-4" /> {t("addSpot")}
              </Command.Item>
              <Command.Item
                value={`${t("surpriseMe")} surprise random`}
                onSelect={() => go("/app?surprise=1")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-primary/10"
              >
                <Shuffle className="h-4 w-4" /> {t("surpriseMe")}
              </Command.Item>
              <Command.Item
                value={`${t("import")} import`}
                onSelect={() => go("/import")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-primary/10"
              >
                <Upload className="h-4 w-4" /> {t("import")}
              </Command.Item>
              <Command.Item
                value={`${t("export")} export`}
                onSelect={() => go("/settings")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-primary/10"
              >
                <Download className="h-4 w-4" /> {t("export")}
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
