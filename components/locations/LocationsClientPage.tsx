"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { Search, Grid3x3, List, Plus, Heart, Bookmark, Eye, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationCard } from "@/components/locations/LocationCard";
import { VirtualLocationList } from "@/components/locations/VirtualLocationList";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

type LocationRow = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isBucketList: boolean;
  isVisited: boolean;
  visitCount: number;
  lastVisitedAt: Date | null;
  createdAt: Date;
  category: { id: string; name: string; color: string; icon: string } | null;
  photos: { url: string }[];
  tags: { tag: { id: string; name: string } }[];
  _count: { visits: number };
};

interface Props {
  initialLocations: LocationRow[];
  categories: { id: string; name: string; color: string }[];
}

type View = "grid" | "list";
type Filter = "all" | "favorites" | "bucket" | "visited" | "unvisited";

export function LocationsClientPage({ initialLocations, categories }: Props) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("grid");
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("updated");

  const filtered = useMemo(() => {
    let locs = initialLocations;

    if (search.trim()) {
      const q = search.toLowerCase();
      locs = locs.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.tags.some((t) => t.tag.name.toLowerCase().includes(q))
      );
    }

    if (filter === "favorites") locs = locs.filter((l) => l.isFavorite);
    if (filter === "bucket") locs = locs.filter((l) => l.isBucketList);
    if (filter === "visited") locs = locs.filter((l) => l.isVisited);
    if (filter === "unvisited") locs = locs.filter((l) => !l.isVisited);

    if (categoryFilter !== "all") locs = locs.filter((l) => l.category?.id === categoryFilter);

    if (sort === "updated")
      locs = [...locs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === "name") locs = [...locs].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "visits") locs = [...locs].sort((a, b) => b.visitCount - a.visitCount);

    return locs;
  }, [initialLocations, search, filter, categoryFilter, sort]);

  const FILTER_TABS: { value: Filter; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <MapPin className="h-3.5 w-3.5" /> },
    { value: "favorites", label: "Favorites", icon: <Heart className="h-3.5 w-3.5" /> },
    { value: "bucket", label: "Bucket", icon: <Bookmark className="h-3.5 w-3.5" /> },
    { value: "visited", label: "Visited", icon: <Eye className="h-3.5 w-3.5" /> },
    { value: "unvisited", label: "New", icon: null },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="My Spots"
        description={`${initialLocations.length} locations saved`}
      >
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/app">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Add on Map</span>
            <span className="xs:hidden">Add</span>
          </Link>
        </Button>
      </PageHeader>

      <div className="px-4 sm:px-6 py-3 border-b border-border/40 bg-background/50 space-y-3">
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search locations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 h-10"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full xs:w-36 h-10 rounded-xl">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-28 h-10 rounded-xl hidden sm:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Latest</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="visits">Most Visited</SelectItem>
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
            Showing <Badge variant="secondary" className="mx-0.5 text-[10px] px-1.5">{filtered.length}</Badge> of {initialLocations.length}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
        {filtered.length === 0 ? (
          <EmptyState search={search} filter={filter} />
        ) : view === "list" && filtered.length > 40 ? (
          <VirtualLocationList locations={filtered} />
        ) : (
          <div
            className={cn(
              view === "grid"
                ? "grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                : "flex flex-col gap-2"
            )}
          >
            {filtered.map((loc) => (
              <LocationCard key={loc.id} location={loc} view={view} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ search, filter }: { search: string; filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50dvh] text-center space-y-4 px-4 animate-fade-in">
      <div className="h-20 w-20 rounded-3xl gradient-nature flex items-center justify-center text-4xl shadow-glow">
        🌿
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="font-bold text-lg">
          {search ? "No matches found" : filter !== "all" ? "Nothing here yet" : "No spots yet"}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {search
            ? "Try a different search term"
            : filter !== "all"
              ? "Save locations and mark them to see them here"
              : "Head to the map and add your first hidden gem!"}
        </p>
      </div>
      {!search && filter === "all" && (
        <Button asChild className="rounded-xl">
          <Link href="/app">
            <MapPin className="h-4 w-4" />
            Open Map
          </Link>
        </Button>
      )}
    </div>
  );
}
