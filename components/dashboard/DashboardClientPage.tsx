"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { format } from "date-fns";
import {
  MapPin, Eye, Heart, Bookmark, TrendingUp, Footprints, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Stats = Awaited<ReturnType<typeof import("@/lib/actions/visits").getDashboardStats>>;

interface Props {
  stats: Stats;
}

export function DashboardClientPage({ stats }: Props) {
  const cards = [
    { label: "Total Spots", value: stats.totalLocations, icon: MapPin, color: "text-primary", href: "/locations" },
    { label: "Visits Logged", value: stats.totalVisits, icon: Footprints, color: "text-green-600", href: "/visits" },
    { label: "Favorites", value: stats.favorites, icon: Heart, color: "text-rose-500", href: "/locations" },
    { label: "Bucket List", value: stats.bucketList, icon: Bookmark, color: "text-amber-500", href: "/locations" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <PageHeader
        title="Dashboard"
        description="Your exploration at a glance"
      >
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/app">Open Map</Link>
        </Button>
      </PageHeader>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ label, value, icon: Icon, color, href }) => (
            <Link
              key={label}
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
          ))}
        </div>

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
    </div>
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
