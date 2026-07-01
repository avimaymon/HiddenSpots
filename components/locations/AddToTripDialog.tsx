"use client";

import { useEffect, useState } from "react";
import { Route, Loader2, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getTrips, addLocationToTrip } from "@/lib/actions/trips";
import { toast } from "@/hooks/use-toast";

interface Props {
  locationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Trip = Awaited<ReturnType<typeof getTrips>>[number];

export function AddToTripDialog({ locationId, open, onOpenChange }: Props) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getTrips().then((t) => { setTrips(t); setLoading(false); });
  }, [open]);

  async function handleAdd(tripId: string) {
    setBusy(tripId);
    try {
      await addLocationToTrip(tripId, locationId);
      toast({ title: "Added to trip", variant: "success" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to add", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            Add to Trip
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No trips yet. Create one from the Trips page.
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
                  <p className="text-xs text-muted-foreground">{trip._count.locations} stops</p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
