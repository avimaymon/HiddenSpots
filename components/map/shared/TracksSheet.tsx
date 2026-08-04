"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Activity, Trash2, Eye, EyeOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTrack, getTrackPoints, getTrackSummaries } from "@/lib/actions/tracks";
import { formatDistance, formatDuration } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Summary = Awaited<ReturnType<typeof getTrackSummaries>>[number];

interface Props {
  open: boolean;
  onClose: () => void;
  activeTrackId: string | null;
  onShowTrack: (track: {
    id: string;
    points: { lat: number; lng: number }[];
  } | null) => void;
}

export function TracksSheet({ open, onClose, activeTrackId, onShowTrack }: Props) {
  const t = useTranslations("map");
  const locale = useLocale();
  const [rows, setRows] = useState<Summary[] | null>(null);
  const [pending, startTransition] = useTransition();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getTrackSummaries(30)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("tracksTitle")}
      className="absolute bottom-20 inset-x-3 z-20 md:bottom-6 md:start-auto md:end-4 md:w-80 pointer-events-auto"
    >
      <div className="glass rounded-2xl shadow-glass border border-border/50 overflow-hidden max-h-[50vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Activity className="h-4 w-4" aria-hidden />
            {t("tracksTitle")}
          </p>
          <Button
            ref={closeBtnRef}
            variant="ghost"
            size="icon-sm"
            className="rounded-xl"
            onClick={onClose}
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto p-2 space-y-1">
          {rows === null && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {rows && rows.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-3">{t("tracksEmpty")}</p>
          )}
          {rows?.map((row) => {
            const active = activeTrackId === row.id;
            const when = new Date(row.createdAt).toLocaleString(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            });
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-xl border px-2.5 py-2 flex items-start gap-2",
                  active ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background/60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{row.name || t("gpxDefaultName")}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {when}
                    {row.distance != null && ` · ${formatDistance(row.distance * 1000, locale)}`}
                    {row.duration != null &&
                      ` · ${formatDuration(Math.max(1, Math.round(row.duration / 60)), locale)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg h-8 w-8 shrink-0"
                  disabled={pending}
                  title={active ? t("tracksHide") : t("tracksShow")}
                  onClick={() => {
                    if (active) {
                      onShowTrack(null);
                      return;
                    }
                    startTransition(async () => {
                      try {
                        const full = await getTrackPoints(row.id);
                        onShowTrack({ id: full.id, points: full.points });
                      } catch {
                        toast({ title: t("tracksLoadFailed"), variant: "destructive" });
                      }
                    });
                  }}
                >
                  {active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg h-8 w-8 shrink-0 text-destructive"
                  disabled={pending}
                  title={t("tracksDelete")}
                  onClick={() => {
                    if (!confirm(t("tracksDeleteConfirm"))) return;
                    startTransition(async () => {
                      try {
                        await deleteTrack(row.id);
                        setRows((prev) => prev?.filter((r) => r.id !== row.id) ?? null);
                        if (active) onShowTrack(null);
                        toast({ title: t("tracksDeleted"), variant: "success" });
                      } catch {
                        toast({ title: t("tracksDeleteFailed"), variant: "destructive" });
                      }
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
