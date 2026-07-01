"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft, Route, MapPin, Plus, Trash2, Loader2,
  ChevronUp, ChevronDown, Share2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addLocationToTrip,
  reorderTripLocations,
  deleteTrip,
} from "@/lib/actions/trips";
import { DbShareDialog } from "@/components/shared/DbShareDialog";
import { toast } from "@/hooks/use-toast";

type Trip = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions/trips").getTripById>>>;

interface Props {
  trip: Trip;
  allLocations: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    category: { color: string } | null;
  }[];
}

export function TripDetailClientPage({ trip: initialTrip, allLocations }: Props) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const existingIds = new Set(trip.locations.map((s) => s.locationId));
  const available = allLocations.filter((l) => !existingIds.has(l.id));

  async function handleAddStop() {
    if (!selectedLocId) return;
    setLoading(true);
    try {
      await addLocationToTrip(trip.id, selectedLocId);
      setAddOpen(false);
      setSelectedLocId("");
      toast({ title: "Stop added", variant: "success" });
      router.refresh();
    } catch (e) {
      toast({ title: "Failed to add stop", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function moveStop(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= trip.locations.length) return;
    const ordered = [...trip.locations];
    [ordered[index], ordered[newIndex]] = [ordered[newIndex], ordered[index]];
    const ids = ordered.map((s) => s.locationId);
    setBusy(ordered[newIndex].id);
    try {
      await reorderTripLocations(trip.id, ids);
      setTrip((t) => ({ ...t, locations: ordered.map((s, i) => ({ ...s, sortOrder: i })) }));
    } catch {
      toast({ title: "Failed to reorder", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteTrip() {
    if (!confirm("Delete this trip?")) return;
    await deleteTrip(trip.id);
    router.push("/trips");
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 glass-strong shrink-0">
        <Button variant="ghost" size="icon-sm" className="rounded-xl" asChild>
          <Link href="/trips"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm truncate">{trip.name}</h1>
          {trip.startDate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(trip.startDate), "MMM d, yyyy")}
              {trip.endDate && ` — ${format(new Date(trip.endDate), "MMM d, yyyy")}`}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => setShareOpen(true)}>
          <Share2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" className="rounded-xl shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {trip.description && (
          <p className="text-sm text-muted-foreground mb-4">{trip.description}</p>
        )}

        {trip.locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30dvh] text-center gap-4">
            <Route className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No stops yet</p>
            <p className="text-sm text-muted-foreground">Add spots from your saved locations or the map</p>
            <Button className="rounded-xl" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add First Stop
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {trip.locations.map((stop, index) => (
              <div
                key={stop.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card hover:border-primary/20 transition-all"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: `${stop.location?.category?.color ?? trip.color}20`,
                    color: stop.location?.category?.color ?? trip.color,
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{stop.location?.title ?? "Unknown"}</p>
                  {stop.location && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0 || busy === stop.id}
                    onClick={() => moveStop(index, -1)}
                    className="rounded-lg"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === trip.locations.length - 1 || busy === stop.id}
                    onClick={() => moveStop(index, 1)}
                    className="rounded-lg"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link href={`/app?spot=${stop.locationId}`}>
                      <MapPin className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-border/50 max-w-2xl">
          <Button variant="ghost" size="sm" className="text-destructive rounded-xl" onClick={handleDeleteTrip}>
            <Trash2 className="h-3.5 w-3.5" /> Delete Trip
          </Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stop</DialogTitle>
          </DialogHeader>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              All your spots are already in this trip, or you have no saved locations.
            </p>
          ) : (
            <Select value={selectedLocId} onValueChange={setSelectedLocId}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Choose a spot…" />
              </SelectTrigger>
              <SelectContent>
                {available.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStop} disabled={loading || !selectedLocId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DbShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tripId={trip.id}
        title={trip.name}
      />
    </div>
  );
}
