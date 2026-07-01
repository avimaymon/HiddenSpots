"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { Plus, Route, MapPin, Trash2, Loader2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createTrip, deleteTrip } from "@/lib/actions/trips";
import { toast } from "@/hooks/use-toast";

type Trip = Awaited<ReturnType<typeof import("@/lib/actions/trips").getTrips>>[number];

interface Props {
  initialTrips: Trip[];
}

export function TripsClientPage({ initialTrips }: Props) {
  const [trips, setTrips] = useState(initialTrips);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const trip = await createTrip({ name: name.trim() });
      setTrips((t) => [{ ...trip, _count: { locations: 0 }, locations: [] }, ...t]);
      setOpen(false);
      setName("");
      toast({ title: "Trip created", variant: "success" });
    } catch {
      toast({ title: "Failed to create trip", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this trip plan?")) return;
    await deleteTrip(id);
    setTrips((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader title="Trips" description="Plan your outdoor adventures">
        <Button size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Trip
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40dvh] text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Route className="h-8 w-8 text-amber-600" />
            </div>
            <p className="font-semibold">No trips planned</p>
            <p className="text-sm text-muted-foreground max-w-xs">Build day trips and multi-day routes from your saved spots</p>
            <Button className="rounded-xl" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Plan a Trip
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
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
                          {trip._count.locations} stops
                        </Badge>
                        {trip.startDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(trip.startDate), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      {trip.locations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trip.locations.slice(0, 5).map((stop, i) => (
                            <span key={stop.id} className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                              {i + 1}. {stop.location?.title ?? "Stop"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="rounded-xl" asChild>
                      <Link href={`/trips/${trip.id}`}>
                        View
                      </Link>
                    </Button>
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
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan a New Trip</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Trip name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Northern waterfalls weekend…"
              className="mt-2 h-11"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
