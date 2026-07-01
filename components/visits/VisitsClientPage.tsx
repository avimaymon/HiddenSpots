"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { Eye, Star, MapPin, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { deleteVisit } from "@/lib/actions/visits";
import { toast } from "@/hooks/use-toast";

type Visit = Awaited<ReturnType<typeof import("@/lib/actions/visits").getVisits>>[number];

interface Props {
  initialVisits: Visit[];
}

export function VisitsClientPage({ initialVisits }: Props) {
  async function handleDelete(id: string) {
    if (!confirm("Delete this visit log?")) return;
    await deleteVisit(id);
    toast({ title: "Visit deleted" });
    window.location.reload();
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Visit Log"
        description={`${initialVisits.length} visits recorded`}
      >
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/app">Log on Map</Link>
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {initialVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40dvh] text-center gap-4">
            <Eye className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold">No visits logged yet</p>
            <p className="text-sm text-muted-foreground">Open a spot and tap the footprints icon to record a visit</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {initialVisits.map((visit) => {
              const photo = visit.location.photos[0];
              return (
                <div
                  key={visit.id}
                  className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3 hover:border-primary/20 transition-all"
                >
                  <Link href={`/locations/${visit.locationId}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-muted">
                      {photo ? (
                        <Image src={photo.url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{visit.location.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(visit.visitedAt), "EEEE, MMM d, yyyy")}
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
                    onClick={() => handleDelete(visit.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
