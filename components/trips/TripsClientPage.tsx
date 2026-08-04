"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Plus, Route, MapPin, Trash2, Loader2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createTrip, deleteTrip } from "@/lib/actions/trips";
import { dropSyncItemsMatchingClientId, enqueueSync } from "@/lib/offline/db";
import { isPendingOfflineId } from "@/lib/offline/pending";
import {
  ID_REMAP_EVENT,
  TRIPS_CACHE_KEY,
  writeEntityCache,
  type IdRemapDetail,
} from "@/lib/offline/entity-cache";
import { toast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDate } from "@/lib/utils";

type Trip = Awaited<ReturnType<typeof import("@/lib/actions/trips").getTrips>>[number];

interface Props {
  initialTrips: Trip[];
}

export function TripsClientPage({ initialTrips }: Props) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [trips, setTrips] = useState(initialTrips);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    writeEntityCache(TRIPS_CACHE_KEY, initialTrips);
  }, [initialTrips]);

  useEffect(() => {
    function onRemap(e: Event) {
      const { clientId, serverId } = (e as CustomEvent<IdRemapDetail>).detail;
      setTrips((prev) => {
        const next = prev.map((trip) =>
          trip.id === clientId ? { ...trip, id: serverId } : trip
        );
        writeEntityCache(TRIPS_CACHE_KEY, next);
        return next;
      });
    }
    window.addEventListener(ID_REMAP_EVENT, onRemap);
    return () => window.removeEventListener(ID_REMAP_EVENT, onRemap);
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (!navigator.onLine) {
        const clientId = crypto.randomUUID();
        await enqueueSync("trip-create", { name: name.trim(), clientId });
        const now = new Date();
        const optimistic = {
          id: clientId,
          name: name.trim(),
          description: null,
          color: "#f59e0b",
          privacy: "PRIVATE" as const,
          startDate: null,
          endDate: null,
          userId: "",
          createdAt: now,
          updatedAt: now,
          _count: { locations: 0 },
          locations: [] as Trip["locations"],
        } as Trip;
        const next = [optimistic, ...trips];
        setTrips(next);
        writeEntityCache(TRIPS_CACHE_KEY, next);
        setOpen(false);
        setName("");
        toast({ title: t("created"), description: t("goMode.offlineQueued"), variant: "success" });
        return;
      }
      const trip = await createTrip({ name: name.trim() });
      const next = [{ ...trip, _count: { locations: 0 }, locations: [] as Trip["locations"] }, ...trips];
      setTrips(next);
      writeEntityCache(TRIPS_CACHE_KEY, next);
      setOpen(false);
      setName("");
      toast({ title: t("created"), variant: "success" });
    } catch {
      toast({ title: t("createFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    if (isPendingOfflineId(id)) {
      await dropSyncItemsMatchingClientId(id);
      setTrips((prev) => prev.filter((x) => x.id !== id));
      writeEntityCache(
        TRIPS_CACHE_KEY,
        trips.filter((x) => x.id !== id)
      );
      return;
    }
    if (!navigator.onLine) {
      await enqueueSync("trip-delete", { tripId: id });
      const next = trips.filter((x) => x.id !== id);
      setTrips(next);
      writeEntityCache(TRIPS_CACHE_KEY, next);
      return;
    }
    await deleteTrip(id);
    setTrips((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader title={t("title")} description={t("description")}>
        <Button size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t("newTrip")}
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40dvh] text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Route className="h-8 w-8 text-amber-600" />
            </div>
            <p className="font-semibold">{t("empty")}</p>
            <p className="text-sm text-muted-foreground max-w-xs">{t("emptyHint")}</p>
            <Button className="rounded-xl" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t("planTrip")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const pending = isPendingOfflineId(trip.id);
              return (
              <div
                key={trip.id}
                className="group rounded-2xl border border-border/50 bg-card p-4 hover:border-primary/25 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${trip.color}20` }}
                    >
                      <Route className="h-5 w-5" style={{ color: trip.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{trip.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {trip._count.locations} {t("stops")}
                        </Badge>
                        {pending && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
                            {t("pendingSync")}
                          </Badge>
                        )}
                        {trip.startDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatLocalizedDate(trip.startDate, "MMM d, yyyy", locale)}
                          </span>
                        )}
                      </div>
                      {trip.locations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trip.locations.slice(0, 5).map((stop, i) => (
                            <span key={stop.id} className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                              {i + 1}. {stop.location?.title ?? "—"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {pending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled
                        title={t("pendingSyncHint")}
                      >
                        {t("pendingSync")}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="rounded-xl" asChild>
                        <Link href={`/trips/${trip.id}`}>{t("view")}</Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                      <Link href="/app">
                        <MapPin className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive rounded-lg opacity-0 group-hover:opacity-100"
                      onClick={() => handleDelete(trip.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("planNewTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>{t("fieldName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("fieldNamePlaceholder")}
              className="mt-2 h-11"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
