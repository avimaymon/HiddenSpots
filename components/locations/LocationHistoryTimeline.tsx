"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { History } from "lucide-react";
import { getLocationHistory } from "@/lib/actions/locations";
import { Skeleton } from "@/components/ui/skeleton";

type HistoryRow = Awaited<ReturnType<typeof getLocationHistory>>[number];

interface Props {
  locationId: string;
}

function snapshotTitle(snapshot: unknown): string | null {
  if (snapshot && typeof snapshot === "object" && "title" in snapshot) {
    const title = (snapshot as { title?: unknown }).title;
    return typeof title === "string" ? title : null;
  }
  return null;
}

export function LocationHistoryTimeline({ locationId }: Props) {
  const t = useTranslations("locations");
  const locale = useLocale();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLocationHistory(locationId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  if (rows === null) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2 pb-2">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <History className="h-4 w-4" />
        {t("historyTitle")}
      </p>
      <ul className="space-y-1.5">
        {rows.map((row) => {
          const title = snapshotTitle(row.snapshot);
          const when = new Date(row.createdAt).toLocaleString(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          });
          return (
            <li
              key={row.id}
              className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs"
            >
              <p className="font-medium text-foreground/90">{t("historyEditedAt", { when })}</p>
              {title && (
                <p className="text-muted-foreground mt-0.5 truncate">
                  {t("historyPreviousTitle", { title })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
