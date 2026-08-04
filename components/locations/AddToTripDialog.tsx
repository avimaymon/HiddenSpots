"use client";

import { useEffect, useState } from "react";
import { Route, Loader2, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getTrips, addLocationToTrip } from "@/lib/actions/trips";
import { enqueueSync } from "@/lib/offline/db";
import {
  TRIPS_CACHE_KEY,
  readEntityCache,
  writeEntityCache,
} from "@/lib/offline/entity-cache";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface Props {
  locationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Trip = Awaited<ReturnType<typeof getTrips>>[number];

export function AddToTripDialog({ locationId, open, onOpenChange }: Props) {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    async function load() {
      if (!navigator.onLine) {
        setTrips(readEntityCache<Trip[]>(TRIPS_CACHE_KEY) ?? []);
        setLoading(false);
        return;
      }
      try {
        const list = await getTrips();
        setTrips(list);
        writeEntityCache(TRIPS_CACHE_KEY, list);
      } catch {
        setTrips(readEntityCache<Trip[]>(TRIPS_CACHE_KEY) ?? []);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [open]);

  async function handleAdd(tripId: string) {
    setBusy(tripId);
    try {
      if (!navigator.onLine) {
        await enqueueSync("trip-add", { tripId, locationId });
        toast({
          title: t("addedToTrip"),
          description: t("goMode.offlineQueued"),
          variant: "success",
        });
        onOpenChange(false);
        return;
      }

      await addLocationToTrip(tripId, locationId);
      toast({ title: t("addedToTrip"), variant: "success" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: t("addToTripFailed"), description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" description={t("addToTripTitle")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            {t("addToTripTitle")}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("noTripsHint")}
          </p>
        ) : (
          <div className="space-y-2 max-h-[50dvh] overflow-y-auto">
            {trips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                disabled={busy === trip.id}
                onClick={() => handleAdd(trip.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/25 hover:bg-muted/50 transition-all text-start"
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${trip.color}20` }}
                >
                  <Route className="h-4 w-4" style={{ color: trip.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{trip.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {trip._count.locations} {t("stops")}
                  </p>
                </div>
                {busy === trip.id ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
