"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Merge } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { findDuplicateSpotsAction, mergeLocations } from "@/lib/actions/locations";
import { Link } from "@/i18n/navigation";

type DupResult = Awaited<ReturnType<typeof findDuplicateSpotsAction>>;
type DuplicateGroup = DupResult["groups"][number];

export function DuplicatesSection() {
  const t = useTranslations("settings");
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [meta, setMeta] = useState<Pick<DupResult, "scanned" | "total" | "truncated"> | null>(null);
  const [loading, setLoading] = useState(false);

  async function detect() {
    setLoading(true);
    try {
      const result = await findDuplicateSpotsAction();
      setGroups(result.groups);
      setMeta({
        scanned: result.scanned,
        total: result.total,
        truncated: result.truncated,
      });
      if (result.groups.length === 0) toast({ title: t("dupNone"), variant: "success" });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge(keepId: string, deleteId: string) {
    try {
      await mergeLocations(keepId, deleteId);
      setGroups((prev) => prev?.filter((g) => !g.some((l) => l.id === deleteId)) ?? null);
      toast({ title: t("dupMerged"), variant: "success" });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("dupTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("dupHint")}</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl shrink-0" onClick={detect} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          {t("dupScan")}
        </Button>
      </div>

      {meta?.truncated && (
        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-xl px-3 py-2">
          {t("dupScannedHint", { scanned: meta.scanned, total: meta.total })}
        </p>
      )}

      {groups?.length === 0 && (
        <p className="text-sm text-green-600 font-medium">✓ {t("dupNone")}</p>
      )}

      {groups?.map((group, gi) => (
        <div key={gi} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-600">{t("dupGroup")}</p>
          {group.map((loc, i) => (
            <div key={loc.id} className="flex items-center gap-2">
              <Link href={`/locations/${loc.id}`} className="text-sm flex-1 truncate hover:underline text-primary">
                {loc.title}
              </Link>
              <span className="text-xs text-muted-foreground font-mono">
                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
              </span>
              {i > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg shrink-0 text-xs h-7 px-2"
                  onClick={() => handleMerge(group[0].id, loc.id)}
                >
                  <Merge className="h-3 w-3" /> {t("dupMerge")}
                </Button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
