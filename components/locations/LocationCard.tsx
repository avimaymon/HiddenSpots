"use client";

import { memo, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Heart, Eye, Bookmark, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuickNavButtons } from "@/components/shared/QuickNavButtons";
import { NavigateShareDialog } from "@/components/shared/NavigateShareDialog";
import { format } from "date-fns";

type LocationRow = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isBucketList: boolean;
  isVisited: boolean;
  visitCount: number;
  createdAt: Date;
  category: { name: string; color: string } | null;
  photos: { url: string }[];
  tags: { tag: { name: string } }[];
};

interface Props {
  location: LocationRow;
  view: "grid" | "list";
}

function LocationCardInner({ location, view }: Props) {
  const photo = location.photos[0];
  const [shareOpen, setShareOpen] = useState(false);
  const coords = {
    latitude: location.latitude,
    longitude: location.longitude,
    title: location.title,
  };

  const shareDialog = (
    <NavigateShareDialog location={coords} open={shareOpen} onOpenChange={setShareOpen} />
  );

  if (view === "list") {
    return (
      <>
        <div className="group flex items-center gap-3 sm:gap-4 p-3 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/25 hover:shadow-md transition-all duration-200">
          <Link href={`/locations/${location.id}`} className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden shrink-0 bg-muted ring-1 ring-border/40">
              {photo ? (
                <Image src={photo.url} alt={location.title} fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center gradient-nature">
                  <MapPin className="h-5 w-5 text-primary/60" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {location.title}
                </p>
                {location.isFavorite && (
                  <Heart className="h-3.5 w-3.5 text-rose-500 fill-current shrink-0" />
                )}
                {location.isBucketList && (
                  <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-current shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {location.category && (
                  <Badge
                    variant="outline"
                    style={{ color: location.category.color, borderColor: `${location.category.color}40` }}
                    className="text-[10px] px-2 py-0"
                  >
                    {location.category.name}
                  </Badge>
                )}
                {location.isVisited && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Eye className="h-3 w-3" /> {location.visitCount}x
                  </span>
                )}
              </div>
            </div>
          </Link>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
              {format(new Date(location.createdAt), "MMM d")}
            </span>
            <QuickNavButtons location={coords} onMore={() => setShareOpen(true)} />
          </div>
        </div>
        {shareDialog}
      </>
    );
  }

  return (
    <>
      <div className="group rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
        <Link href={`/locations/${location.id}`} className="block">
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            {photo ? (
              <Image
                src={photo.url}
                alt={location.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="h-full flex items-center justify-center gradient-nature">
                <MapPin className="h-10 w-10 text-primary/25" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute top-2 end-2 flex gap-1">
              {location.isFavorite && (
                <div className="h-7 w-7 rounded-full glass flex items-center justify-center">
                  <Heart className="h-3.5 w-3.5 text-rose-500 fill-current" />
                </div>
              )}
              {location.isBucketList && (
                <div className="h-7 w-7 rounded-full glass flex items-center justify-center">
                  <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-current" />
                </div>
              )}
            </div>

            {location.category && (
              <div className="absolute bottom-2 start-2">
                <Badge
                  style={{ background: `${location.category.color}e6`, color: "#fff" }}
                  className="text-[10px] shadow-md border-0 backdrop-blur-sm"
                >
                  {location.category.name}
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3 sm:p-3.5">
            <p className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {location.title}
            </p>
            {location.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {location.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <MapPin className="h-3 w-3 text-primary/60" />
                {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
              </div>
              {location.isVisited && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                  <Eye className="h-3 w-3" />
                  {location.visitCount} visits
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="px-3 pb-3 flex items-center justify-between gap-2 border-t border-border/30 bg-muted/10">
          <QuickNavButtons location={coords} onMore={() => setShareOpen(true)} />
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg shrink-0"
            onClick={() => setShareOpen(true)}
            title="Navigate & Share"
          >
            <Navigation className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {shareDialog}
    </>
  );
}

export const LocationCard = memo(LocationCardInner);
