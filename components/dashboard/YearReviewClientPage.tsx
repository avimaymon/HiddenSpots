"use client";

import { useRef } from "react";
import type { getYearReview } from "@/lib/actions/year-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2 } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SEASON_EMOJI: Record<string, string> = { spring: "🌸", summer: "☀️", fall: "🍂", winter: "❄️" };

type Data = Awaited<ReturnType<typeof getYearReview>>;

export function YearReviewClientPage({ data }: { data: Data }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const max = Math.max(...data.byMonth.map((m) => m.count), 1);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `My ${data.year} in HiddenSpots`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{data.year} in Review</h1>
          <p className="text-muted-foreground">Your year exploring hidden spots</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-1.5" /> Share
        </Button>
      </div>

      <div ref={cardRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Visits", value: data.totalVisits },
          { label: "Unique Spots", value: data.uniqueSpots },
          { label: "New Locations", value: data.newLocations },
          { label: "Fav Season", value: data.favSeason ? `${SEASON_EMOJI[data.favSeason]} ${data.favSeason}` : "—" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold capitalize">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Visits by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-28">
            {data.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-primary/70 transition-all"
                  style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count > 0 ? "4px" : "0" }}
                />
                <span className="text-[9px] text-muted-foreground">{MONTHS[m.month]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.topLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Most Visited Spots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topLocations.map((loc, i) => (
              <div key={loc.title} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                  {loc.title}
                </span>
                <span className="text-muted-foreground">{loc.visitCount} visits</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
