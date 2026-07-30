"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion/primitives";
import {
  MapPin, Eye, Heart, Bookmark, TrendingUp, Footprints, ArrowRight,
  Flame, Shuffle, Sun, Trophy, Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartViewsSection } from "@/components/dashboard/SmartViewsSection";
import { useTranslations } from "next-intl";
import { NearbyNowCard } from "@/components/dashboard/NearbyNowCard";
import { BadgesSection } from "@/components/dashboard/BadgesSection";

type Stats = Awaited<ReturnType<typeof import("@/lib/actions/visits").getDashboardStats>>;
type SmartView = Awaited<ReturnType<typeof import("@/lib/actions/smart-views").getSmartViews>>[0];

interface Props {
  stats: Stats;
  smartViews: SmartView[];
}

const WIDGET_KEYS = ["nearby", "rank", "stats", "seasonal", "bucketlist", "badges"] as const;
type WidgetKey = typeof WIDGET_KEYS[number];

const WIDGET_LABELS: Record<WidgetKey, string> = {
  nearby: "Nearby Now",
  rank: "Explorer Rank & Streak",
  stats: "Stats Cards",
  seasonal: "Seasonal Recommendations",
  bucketlist: "Bucket List Progress",
  badges: "Explorer Badges",
};

function useWidgetVisibility() {
  const STORAGE_KEY = "hs_dashboard_widgets";
  const [hidden, setHidden] = useState<Set<WidgetKey>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as WidgetKey[];
      return new Set(saved);
    } catch { return new Set(); }
  });

  function toggle(key: WidgetKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return { hidden, toggle };
}

export function DashboardClientPage({ stats, smartViews }: Props) {
  const t = useTranslations("dashboard");
  const { hidden, toggle } = useWidgetVisibility();
  const [showConfig, setShowConfig] = useState(false);

  const cards = [
    { label: t("stats.locations"), value: stats.totalLocations, icon: MapPin, color: "text-primary", href: "/locations" },
    { label: t("stats.visits"), value: stats.totalVisits, icon: Footprints, color: "text-green-600", href: "/visits" },
    { label: t("stats.favorites"), value: stats.favorites, icon: Heart, color: "text-rose-500", href: "/locations" },
    { label: t("stats.bucketList"), value: stats.bucketList, icon: Bookmark, color: "text-amber-500", href: "/locations" },
  ];

  return (
    <FadeIn className="flex flex-col h-full min-h-0 overflow-auto">
      <PageHeader
        title={t("title")}
        description=""
      >
        <Button variant="ghost" size="icon-sm" className="rounded-xl" onClick={() => setShowConfig((v) => !v)} title="Configure widgets">
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/app">{t("viewAll")}</Link>
        </Button>
      </PageHeader>

      {showConfig && (
        <div className="px-4 sm:px-6 py-3 border-b border-border/50 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Show/hide widgets</p>
          <div className="flex flex-wrap gap-2">
            {WIDGET_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-all ${hidden.has(key) ? "bg-muted border-border text-muted-foreground" : "bg-primary text-primary-foreground border-primary"}`}
              >
                {hidden.has(key) ? "+" : "✓"} {WIDGET_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-6">
        <SmartViewsSection initialViews={smartViews as Parameters<typeof SmartViewsSection>[0]["initialViews"]} />

        {/* Explorer rank + streak + surprise */}
        {!hidden.has("rank") && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground font-medium">Explorer Rank</p>
            </div>
            <p className="text-lg font-bold">{stats.explorerRank}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-muted-foreground font-medium">Visit Streak</p>
            </div>
            <p className="text-lg font-bold">{stats.visitStreak} <span className="text-xs font-normal text-muted-foreground">weeks</span></p>
          </div>
          <Link
            href="/app?surprise=1"
            className="rounded-2xl border border-border/50 bg-card/60 p-4 hover:border-primary/30 transition-all flex flex-col justify-between col-span-2 sm:col-span-1"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Shuffle className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Surprise Me</p>
            </div>
            <p className="text-sm font-semibold text-primary">Random spot →</p>
          </Link>
        </div>}

        {/* Bucket list progress */}
        {!hidden.has("bucketlist") && stats.bucketList > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Bookmark className="h-4 w-4 text-amber-500" /> Bucket List
              </p>
              <span className="text-xs text-muted-foreground tabular-nums">
                {stats.bucketListVisited} / {stats.bucketList} visited
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${(stats.bucketListVisited / stats.bucketList) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!hidden.has("stats") && <StaggerList className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ label, value, icon: Icon, color, href }) => (
            <StaggerItem key={href}>
            <Link
              href={href}
              className="rounded-2xl border border-border/50 bg-card/60 p-4 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
            </Link>
            </StaggerItem>
          ))}
        </StaggerList>}

        {/* Nearby Now */}
        {!hidden.has("nearby") && <NearbyNowCard locations={stats.recentLocations as { id: string; title: string; latitude: number; longitude: number }[]} />}

        {/* Seasonal recommendations */}
        {!hidden.has("seasonal") && stats.seasonalSpots.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun className="h-4 w-4 text-amber-500" />
              <h2 className="font-bold text-sm">Good for {stats.currentSeason}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.seasonalSpots.map((loc) => (
                <Link key={loc.id} href={`/locations/${loc.id}`}
                  className="rounded-xl border border-border/50 bg-card/60 p-3 hover:border-primary/30 transition-all"
                >
                  <p className="text-xs font-semibold truncate">{loc.title}</p>
                  {loc.category && <p className="text-[10px] text-muted-foreground mt-0.5">{loc.category.name}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {!hidden.has("badges") && stats.earnedBadges.length > 0 && (
          <BadgesSection earnedIds={stats.earnedBadges} />
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Recently Added" href="/locations">
            {stats.recentLocations.length === 0 ? (
              <Empty hint="Add your first spot on the map" />
            ) : (
              stats.recentLocations.map((loc) => (
                <SpotRow key={loc.id} id={loc.id} title={loc.title} photo={loc.photos[0]?.url} category={loc.category?.name} meta={format(new Date(loc.createdAt), "MMM d")} />
              ))
            )}
          </Section>

          <Section title="Most Visited" href="/visits">
            {stats.topVisited.length === 0 ? (
              <Empty hint="Log visits to track your favorites" />
            ) : (
              stats.topVisited.map((loc) => (
                <SpotRow key={loc.id} id={loc.id} title={loc.title} photo={loc.photos[0]?.url} category={loc.category?.name} meta={`${loc.visitCount} visits`} />
              ))
            )}
          </Section>
        </div>

        <Section title="Recent Visits" href="/visits" full>
          {stats.recentVisits.length === 0 ? (
            <Empty hint="Tap the footprints icon on any spot to log a visit" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {stats.recentVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/locations/${visit.locationId}`}
                  className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{visit.location.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(visit.visitedAt), "MMM d, yyyy")}
                      {visit.rating ? ` · ${"★".repeat(visit.rating)}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>
    </FadeIn>
  );
}

function Section({
  title,
  href,
  children,
  full,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">{title}</h2>
        <Link href={href} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card/40 divide-y divide-border/40 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SpotRow({
  id,
  title,
  photo,
  category,
  meta,
}: {
  id: string;
  title: string;
  photo?: string;
  category?: string;
  meta: string;
}) {
  return (
    <Link
      href={`/locations/${id}`}
      className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
    >
      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-muted">
        {photo ? (
          <Image src={photo} alt="" fill className="object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{title}</p>
        {category && <Badge variant="outline" className="text-[10px] mt-0.5">{category}</Badge>}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{meta}</span>
    </Link>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <p className="text-sm text-muted-foreground p-6 text-center">{hint}</p>
  );
}
