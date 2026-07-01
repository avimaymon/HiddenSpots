"use client";

import Link from "next/link";
import { MapPin, FolderOpen, Route, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/shared/AppLogo";
import { QuickNavButtons } from "@/components/shared/QuickNavButtons";

type Share = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions/shares").getShareByToken>>>;

interface Props {
  share: Share;
}

export function SharePublicPage({ share }: Props) {
  const location = share.location;
  const collection = share.collection;
  const trip = share.trip;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border/50 glass-strong px-4 py-4 flex items-center justify-between">
        <AppLogo size="sm" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          {share.viewCount} views
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        {location && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{location.title}</h1>
                {location.category && (
                  <Badge variant="outline" className="mt-2" style={{ color: location.category.color }}>
                    {location.category.name}
                  </Badge>
                )}
              </div>
            </div>
            {location.description && (
              <p className="text-muted-foreground leading-relaxed">{location.description}</p>
            )}
            <div className="rounded-2xl border border-border/50 p-4 space-y-3">
              <p className="text-sm font-mono text-muted-foreground">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </p>
              <QuickNavButtons
                location={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  title: location.title,
                  address: location.address,
                }}
              />
            </div>
            {location.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {location.photos.slice(0, 4).map((p) => (
                  <img key={p.id} src={p.url} alt="" className="rounded-xl aspect-video object-cover" />
                ))}
              </div>
            )}
          </section>
        )}

        {collection && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{collection.name}</h1>
            </div>
            {collection.description && (
              <p className="text-muted-foreground">{collection.description}</p>
            )}
            <div className="space-y-2">
              {collection.locations.map((cl) => (
                <div
                  key={cl.collectionId + cl.locationId}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{cl.location.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {cl.location.latitude.toFixed(4)}, {cl.location.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {trip && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Route className="h-6 w-6" style={{ color: trip.color }} />
              <h1 className="text-2xl font-bold">{trip.name}</h1>
            </div>
            {trip.description && <p className="text-muted-foreground">{trip.description}</p>}
            <ol className="space-y-2">
              {trip.locations.map((stop, i) => (
                <li
                  key={stop.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50"
                >
                  <span
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${trip.color}20`, color: trip.color }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{stop.location.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="pt-6 border-t border-border/50 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Shared via HiddenSpots</p>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/signin">
              <ExternalLink className="h-4 w-4" /> Create your own atlas
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
