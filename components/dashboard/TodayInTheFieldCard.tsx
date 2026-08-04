"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Footprints, CloudOff, Navigation, Sun } from "lucide-react";
import * as turf from "@turf/turf";
import { pendingSyncCount } from "@/lib/offline/db";
import { formatDistance } from "@/lib/utils";

interface Props {
  todayVisits: number;
  locations: { id: string; title: string; latitude: number; longitude: number }[];
}

/** Compact “today” pulse: visits logged, pending sync, nearest spot. */
export function TodayInTheFieldCard({ todayVisits, locations }: Props) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [pending, setPending] = useState(0);
  const [nearest, setNearest] = useState<{ id: string; title: string; meters: number } | null>(
    null
  );

  useEffect(() => {
    let alive = true;
    void pendingSyncCount().then((n) => {
      if (alive) setPending(n);
    });
    const onOnline = () => {
      void pendingSyncCount().then((n) => {
        if (alive) setPending(n);
      });
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onOnline);
    window.addEventListener("hs:sync-queue", onOnline);
    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onOnline);
      window.removeEventListener("hs:sync-queue", onOnline);
    };
  }, []);

  useEffect(() => {
    if (!locations.length || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const from = turf.point([pos.coords.longitude, pos.coords.latitude]);
        let minD = Infinity;
        let best = locations[0];
        for (const loc of locations) {
          const d = turf.distance(from, turf.point([loc.longitude, loc.latitude]));
          if (d < minD) {
            minD = d;
            best = loc;
          }
        }
        setNearest({ id: best.id, title: best.title, meters: minD * 1000 });
      },
      () => {},
      { maximumAge: 60_000, timeout: 5_000 }
    );
  }, [locations]);

  return (
    <section
      aria-label={t("today.title")}
      className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card/60 to-card/40 p-4 space-y-3"
    >
      <div className="flex items-center gap-1.5">
        <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
        <h2 className="text-sm font-semibold">{t("today.title")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background/50 px-3 py-2.5">
          <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
            <Footprints className="h-3.5 w-3.5" aria-hidden />
            <p className="text-[11px] font-medium">{t("today.visits")}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{todayVisits}</p>
        </div>
        <div className="rounded-xl bg-background/50 px-3 py-2.5">
          <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
            <CloudOff className="h-3.5 w-3.5" aria-hidden />
            <p className="text-[11px] font-medium">{t("today.pendingSync")}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{pending}</p>
        </div>
      </div>

      {nearest ? (
        <Link
          href={`/locations/${nearest.id}`}
          className="flex items-center gap-2 rounded-xl bg-background/60 px-3 py-2.5 hover:bg-background/80 transition-colors"
        >
          <Navigation className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground font-medium">{t("nearbyNow")}</p>
            <p className="text-sm font-bold truncate">{nearest.title}</p>
          </div>
          <p className="text-sm font-bold text-primary shrink-0 tabular-nums">
            {formatDistance(nearest.meters, locale)}
          </p>
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground px-0.5">{t("today.nearbyHint")}</p>
      )}

      <Link
        href="/app"
        className="inline-flex text-xs font-semibold text-primary hover:underline"
      >
        {t("today.openMap")}
      </Link>
    </section>
  );
}
