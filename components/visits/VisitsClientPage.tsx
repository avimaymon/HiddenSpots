"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Eye, Star, MapPin, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { deleteVisit, getVisitsPage } from "@/lib/actions/visits";
import { toast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDate } from "@/lib/utils";

type Visit = Awaited<ReturnType<typeof getVisitsPage>>["items"][number];

interface Props {
  initialVisits: Visit[];
  totalCount: number;
  initialHasMore: boolean;
  initialNextSkip: number;
}

export function VisitsClientPage({
  initialVisits,
  totalCount,
  initialHasMore,
  initialNextSkip,
}: Props) {
  const t = useTranslations("visits");
  const locale = useLocale();
  const [visits, setVisits] = useState(initialVisits);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextSkip, setNextSkip] = useState(initialNextSkip);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      try {
        await deleteVisit(id);
        setVisits((prev) => prev.filter((v) => v.id !== id));
        toast({ title: t("deleted") });
      } catch {
        toast({ title: t("logFailed"), variant: "destructive" });
      }
    });
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getVisitsPage({ skip: nextSkip });
      setVisits((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
      setNextSkip(page.nextSkip);
    } catch {
      toast({ title: t("logFailed"), variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title={t("title")}
        description={t("description", { count: totalCount })}
      >
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/app">{t("logOnMap")}</Link>
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40dvh] text-center gap-4">
            <Eye className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {visits.map((visit) => {
              const photo = visit.location.photos[0];
              return (
                <div
                  key={visit.id}
                  className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3 hover:border-primary/20 transition-all"
                >
                  <Link href={`/locations/${visit.locationId}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-muted">
                      {photo ? (
                        <Image src={photo.url} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{visit.location.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatLocalizedDate(visit.visitedAt, "EEEE, MMM d, yyyy", locale)}
                      </p>
                      {visit.rating && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: visit.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                      {visit.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{visit.notes}</p>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive rounded-lg opacity-0 group-hover:opacity-100 shrink-0"
                    disabled={pending}
                    onClick={() => handleDelete(visit.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {hasMore && (
              <div className="pt-3 flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
