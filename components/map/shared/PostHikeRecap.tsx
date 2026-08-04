"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Footprints, Route, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistance, formatDuration } from "@/lib/utils";
import type { CorridorSpot, summarizeTrackPoints } from "@/lib/geo/track-stats";
import { createVisit } from "@/lib/actions/visits";
import { enqueueSync } from "@/lib/offline/db";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Stats = ReturnType<typeof summarizeTrackPoints>;

interface Props {
  open: boolean;
  stats: Stats | null;
  nearbySpots?: CorridorSpot[];
  onClose: () => void;
  onOpenTracks?: () => void;
}

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

export function PostHikeRecap({
  open,
  stats,
  nearbySpots = [],
  onClose,
  onOpenTracks,
}: Props) {
  const t = useTranslations("map");
  const locale = useLocale();
  const [logged, setLogged] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !stats) return;
    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = focusableIn(panelRef.current);
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, stats, onClose]);

  if (!open || !stats) return null;

  const durationMin =
    stats.durationSec != null ? Math.max(1, Math.round(stats.durationSec / 60)) : null;

  function logVisit(spot: CorridorSpot) {
    if (logged.has(spot.id) || spot.isVisited) return;
    startTransition(async () => {
      try {
        const payload = {
          locationId: spot.id,
          visitedAt: new Date().toISOString(),
        };
        if (navigator.onLine) {
          await createVisit(payload);
        } else {
          await enqueueSync("visit", payload);
        }
        setLogged((prev) => new Set(prev).add(spot.id));
        toast({ title: t("recapVisitLogged"), variant: "success" });
      } catch {
        toast({ title: t("recapVisitFailed"), variant: "destructive" });
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("recapTitle")}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 pointer-events-auto"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-2xl border border-border/50 bg-card shadow-float p-4 space-y-4 max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold">{t("recapTitle")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("recapSubtitle")}</p>
          </div>
          <Button
            ref={closeBtnRef}
            variant="ghost"
            size="icon-sm"
            className="rounded-xl"
            aria-label={t("cancel")}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/40 px-2.5 py-2.5 text-center">
            <Route className="h-3.5 w-3.5 mx-auto text-primary mb-1" aria-hidden />
            <p className="text-sm font-bold tabular-nums">
              {formatDistance(stats.distanceKm * 1000, locale)}
            </p>
            <p className="text-[10px] text-muted-foreground">{t("recapDistance")}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-2.5 py-2.5 text-center">
            <Timer className="h-3.5 w-3.5 mx-auto text-primary mb-1" aria-hidden />
            <p className="text-sm font-bold tabular-nums">
              {durationMin != null ? formatDuration(durationMin, locale) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">{t("recapDuration")}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-2.5 py-2.5 text-center">
            <Footprints className="h-3.5 w-3.5 mx-auto text-primary mb-1" aria-hidden />
            <p className="text-sm font-bold tabular-nums">{stats.pointCount}</p>
            <p className="text-[10px] text-muted-foreground">{t("recapPoints")}</p>
          </div>
        </div>

        {nearbySpots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("recapNearby")}
            </p>
            <ul className="space-y-1.5">
              {nearbySpots.map((spot) => {
                const done = spot.isVisited || logged.has(spot.id);
                return (
                  <li
                    key={spot.id}
                    className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{spot.title}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {formatDistance(spot.distanceKm * 1000, locale)} {t("recapFromTrack")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "outline"}
                      className={cn("rounded-xl h-8 shrink-0 gap-1", done && "opacity-80")}
                      disabled={done || pending}
                      onClick={() => logVisit(spot)}
                    >
                      {done ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          {t("recapVisited")}
                        </>
                      ) : (
                        t("recapLogVisit")
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          {onOpenTracks && (
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => {
                onOpenTracks();
                onClose();
              }}
            >
              {t("tracksTitle")}
            </Button>
          )}
          <Button className="flex-1 rounded-xl" onClick={onClose}>
            {t("recapDone")}
          </Button>
        </div>
      </div>
    </div>
  );
}
