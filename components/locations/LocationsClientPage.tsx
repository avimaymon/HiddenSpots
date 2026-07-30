"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Search, Grid3x3, List, Plus, Heart, Bookmark, Eye, MapPin, X, CheckSquare, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationCard } from "@/components/locations/LocationCard";
import { VirtualLocationList } from "@/components/locations/VirtualLocationList";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { DriveQuickBackup } from "@/components/settings/DriveQuickBackup";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { deleteLocation } from "@/lib/actions/locations";
import { toast } from "@/hooks/use-toast";
import {
  parseHebrewQuery,
  hasNlFilters,
  matchLocationAgainstNl,
} from "@/lib/search/hebrew-nl";
import { useGeolocation } from "@/hooks/use-geolocation";
import { sortByDistance, filterWithinRadius, DEFAULT_NEARBY_RADIUS_M } from "@/lib/geo/nearby";

type LocationRow = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isBucketList: boolean;
  isVisited: boolean;
  isDogFriendly?: boolean | null;
  isFamilyFriendly?: boolean | null;
  isCampingAllowed?: boolean | null;
  hasParking?: boolean | null;
  hasWater?: boolean | null;
  hasShade?: boolean | null;
  visitCount: number;
  lastVisitedAt: Date | null;
  createdAt: Date;
  category: { id: string; name: string; nameHe?: string | null; color: string; icon: string } | null;
  photos: { url: string }[];
  tags: { tag: { id: string; name: string } }[];
  _count: { visits: number };
};

interface Props {
  initialLocations: LocationRow[];
  categories: { id: string; name: string; color: string }[];
}

type View = "grid" | "list";
type Filter = "all" | "favorites" | "bucket" | "visited" | "unvisited" | "stale3" | "stale6" | "stale12";

export function LocationsClientPage({ initialLocations, categories }: Props) {
  const t = useTranslations("locations");
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [view, setView] = useState<View>("grid");
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("updated");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { latitude: gpsLat, longitude: gpsLng } = useGeolocation(true);
  const gps =
    gpsLat != null && gpsLng != null
      ? { latitude: gpsLat, longitude: gpsLng }
      : null;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((l) => l.id)));
  }

  function handleBatchDelete() {
    if (!selectedIds.size) return;
    startTransition(async () => {
      for (const id of selectedIds) await deleteLocation(id);
      toast({ title: `Deleted ${selectedIds.size} spot(s)`, variant: "success" });
      setSelectedIds(new Set());
      setBatchMode(false);
    });
  }

  const allTags = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of initialLocations) {
      for (const { tag } of loc.tags) {
        map.set(tag.id, tag.name);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [initialLocations]);

  const nl = search.trim() ? parseHebrewQuery(search) : null;
  const nlActive = Boolean(nl && hasNlFilters(nl));

  // ponytail: no manual useMemo — React Compiler handles memoization automatically
  function getFiltered() {
    let locs = initialLocations;

    if (search.trim()) {
      if (nl && hasNlFilters(nl)) {
        locs = locs.filter((l) => matchLocationAgainstNl(l, nl));
      } else {
        const q = search.toLowerCase();
        locs = locs.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q) ||
            l.tags.some((tg) => tg.tag.name.toLowerCase().includes(q))
        );
      }
    }

    if (filter === "favorites") locs = locs.filter((l) => l.isFavorite);
    if (filter === "bucket") locs = locs.filter((l) => l.isBucketList);
    if (filter === "visited") locs = locs.filter((l) => l.isVisited);
    if (filter === "unvisited") locs = locs.filter((l) => !l.isVisited);
    if (filter === "stale3" || filter === "stale6" || filter === "stale12") {
      const months = filter === "stale3" ? 3 : filter === "stale6" ? 6 : 12;
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      locs = locs.filter((l) => !l.lastVisitedAt || new Date(l.lastVisitedAt) < cutoff);
    }

    if (categoryFilter !== "all") locs = locs.filter((l) => l.category?.id === categoryFilter);
    if (tagFilter !== "all") locs = locs.filter((l) => l.tags.some((tg) => tg.tag.id === tagFilter));

    // NL "לידי" / nearby → radius filter + distance sort
    if (nl?.nearby && gps) {
      locs = sortByDistance(filterWithinRadius(locs, gps, DEFAULT_NEARBY_RADIUS_M), gps);
    } else if ((sort === "distance" || sort === "nearest") && gps) {
      locs = sortByDistance(locs, gps);
    } else if (sort === "updated") {
      locs = [...locs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "name") {
      locs = [...locs].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "visits") {
      locs = [...locs].sort((a, b) => b.visitCount - a.visitCount);
    }

    return locs;
  }
  const filtered = getFiltered();

  const FILTER_TABS: { value: Filter; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: t("filters.all"), icon: <MapPin className="h-3.5 w-3.5" /> },
    { value: "favorites", label: t("filters.favorites"), icon: <Heart className="h-3.5 w-3.5" /> },
    { value: "bucket", label: t("filters.bucketList"), icon: <Bookmark className="h-3.5 w-3.5" /> },
    { value: "visited", label: t("filters.visited"), icon: <Eye className="h-3.5 w-3.5" /> },
    { value: "unvisited", label: t("filters.notVisited"), icon: null },
    { value: "stale3", label: "Stale 3m", icon: null },
    { value: "stale6", label: "Stale 6m", icon: null },
    { value: "stale12", label: "Stale 1y", icon: null },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mobile full-screen search overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 glass-strong">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                autoFocus
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 h-11 text-base rounded-xl"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileSearchOpen(false)}
              className="rounded-xl shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {nlActive && nl && (
            <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border/40">
              {nl.matched.map((m) => (
                <Badge key={m} variant="secondary" className="rounded-lg text-xs">
                  {m}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-2 border-b border-border/40">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  filter === tab.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 bg-background"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {filtered.length === 0 ? (
              <EmptyState search={search} filter={filter} t={t} />
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.slice(0, 30).map((loc) => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    view="list"
                    onClick={() => setMobileSearchOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PageHeader
        title={t("title")}
        description={`${initialLocations.length} ${t("filters.all").toLowerCase()}`}
      >
        {/* Mobile: Search icon opens full-screen search */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden rounded-xl"
          onClick={() => setMobileSearchOpen(true)}
          aria-label={t("searchPlaceholder")}
        >
          <Search className="h-4 w-4" />
        </Button>
        <DriveQuickBackup />
        <Button
          variant={batchMode ? "secondary" : "ghost"}
          size="icon-sm"
          className="rounded-xl"
          onClick={() => { setBatchMode((v) => !v); setSelectedIds(new Set()); }}
          title="Select multiple"
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/app">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">{t("addNew")}</span>
            <span className="xs:hidden">+</span>
          </Link>
        </Button>
      </PageHeader>

      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-primary/5 border-b border-border/50">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="ghost" size="sm" onClick={selectAll} className="rounded-xl text-xs h-7">Select all</Button>
          <div className="flex-1" />
          <Button
            variant="destructive"
            size="sm"
            className="rounded-xl text-xs h-7"
            onClick={handleBatchDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      )}

      <div className="px-4 sm:px-6 py-3 border-b border-border/40 bg-background/50 space-y-3">
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
          {/* Desktop search */}
          <div className="relative flex-1 min-w-0 hidden sm:block">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 h-10"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full xs:w-36 h-10 rounded-xl">
                <SelectValue placeholder={t("filters.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-full xs:w-32 h-10 rounded-xl">
                  <SelectValue placeholder={t("filters.tags")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allTags")}</SelectItem>
                  {allTags.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-28 h-10 rounded-xl hidden sm:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">{t("sort.newest")}</SelectItem>
                <SelectItem value="nearest">{t("sort.nearest")}</SelectItem>
                <SelectItem value="name">{t("sort.name")}</SelectItem>
                <SelectItem value="visits">{t("sort.lastVisited")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border border-border/60 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "px-3 py-2 transition-colors touch-target",
                  view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted/80"
                )}
                aria-label="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-2 transition-colors touch-target",
                  view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted/80"
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                filter === tab.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                  : "border-border/60 bg-background hover:bg-muted/60"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length !== initialLocations.length && (
          <p className="text-xs text-muted-foreground">
            <Badge variant="secondary" className="mx-0.5 text-[10px] px-1.5">{filtered.length}</Badge> / {initialLocations.length}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
        {filtered.length === 0 ? (
          <EmptyState search={search} filter={filter} t={t} />
        ) : view === "list" && filtered.length > 40 ? (
          <VirtualLocationList locations={filtered} />
        ) : (
          <StaggerList
            className={cn(
              view === "grid"
                ? "grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                : "flex flex-col gap-2"
            )}
            stagger={0.04}
          >
            {filtered.map((loc) => (
              <StaggerItem key={loc.id}>
                <div className={cn("relative", batchMode && "cursor-pointer")} onClick={batchMode ? () => toggleSelect(loc.id) : undefined}>
                  {batchMode && (
                    <div className={cn(
                      "absolute top-2 start-2 z-10 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors",
                      selectedIds.has(loc.id) ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
                    )}>
                      {selectedIds.has(loc.id) && <span className="text-[10px]">✓</span>}
                    </div>
                  )}
                  <LocationCard location={loc} view={view} />
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  search,
  filter,
  t,
}: {
  search: string;
  filter: Filter;
  t: ReturnType<typeof useTranslations<"locations">>;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50dvh] text-center space-y-5 px-4 animate-fade-in">
      <div className="relative h-28 w-28 rounded-[2rem] gradient-nature flex items-center justify-center shadow-float overflow-hidden">
        <div className="absolute inset-0 sun-flare opacity-50" />
        <svg viewBox="0 0 64 64" className="relative h-14 w-14 text-primary" aria-hidden>
          <path
            fill="currentColor"
            fillOpacity="0.2"
            d="M8 48c8-14 16-22 24-22s16 8 24 22H8z"
          />
          <circle cx="32" cy="22" r="10" fill="currentColor" fillOpacity="0.35" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M20 40c4-6 8-9 12-9s8 3 12 9"
          />
          <circle cx="32" cy="36" r="3" fill="currentColor" />
        </svg>
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="font-bold text-lg">
          {search ? t("noResults") : t("empty")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {search ? t("noResultsHint") : t("emptyHint")}
        </p>
      </div>
      {!search && filter === "all" && (
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Button asChild className="rounded-xl fab-nature border-0 text-primary-foreground">
            <Link href="/app">
              <Plus className="h-4 w-4" />
              {t("emptyCtaAdd")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/import">
              <Upload className="h-4 w-4" />
              {t("emptyCtaImport")}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/app">
              <MapPin className="h-4 w-4" />
              {t("navigate")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
