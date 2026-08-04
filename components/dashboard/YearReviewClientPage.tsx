"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { getYearReview } from "@/lib/actions/year-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2 } from "lucide-react";

const SEASON_EMOJI: Record<string, string> = {
  spring: "🌸",
  summer: "☀️",
  fall: "🍂",
  winter: "❄️",
};

type Data = Awaited<ReturnType<typeof getYearReview>>;

export function YearReviewClientPage({ data }: { data: Data }) {
  const t = useTranslations("yearReview");
  const cardRef = useRef<HTMLDivElement>(null);
  const max = Math.max(...data.byMonth.map((m) => m.count), 1);

  const seasonKey = data.favSeason?.toLowerCase() ?? "";
  const favSeasonLabel =
    seasonKey && (seasonKey in SEASON_EMOJI)
      ? `${SEASON_EMOJI[seasonKey]} ${t(`seasons.${seasonKey}` as "seasons.spring")}`
      : "—";

  async function handleShare() {
    const url = window.location.href;
    const title = t("shareTitle", { year: data.year });
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const stats = [
    { label: t("visits"), value: String(data.totalVisits) },
    { label: t("uniqueSpots"), value: String(data.uniqueSpots) },
    { label: t("newLocations"), value: String(data.newLocations) },
    { label: t("favSeason"), value: favSeasonLabel },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("title", { year: data.year })}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl shrink-0">
          <Share2 className="h-4 w-4 me-1.5" /> {t("share")}
        </Button>
      </div>

      <div ref={cardRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("byMonth")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-28">
            {data.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-primary/70 transition-all"
                  style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count > 0 ? "4px" : "0" }}
                />
                <span className="text-[9px] text-muted-foreground">
                  {t(`months.${m.month}` as "months.0")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.topLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("topSpots")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topLocations.map((loc, i) => (
              <div key={loc.title} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground w-5 text-end shrink-0">{i + 1}.</span>
                  <span className="truncate">{loc.title}</span>
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {t("visitsCount", { count: loc.visitCount })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
