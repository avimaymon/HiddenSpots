import type { MapLocation } from "@/lib/map/types";
import { Heart, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { QuickNavButtons } from "@/components/shared/QuickNavButtons";

interface Props {
  location: MapLocation;
  onClick: () => void;
  onNavigateMore?: () => void;
}

export function LocationPopup({ location, onClick, onNavigateMore }: Props) {
  return (
    <div className="group text-left w-56 focus:outline-none">
      <button type="button" onClick={onClick} className="w-full text-left focus:outline-none">
        {location.coverPhotoUrl && (
          <div className="relative h-28 w-full overflow-hidden rounded-t-xl">
            <Image
              src={location.coverPhotoUrl}
              alt={location.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-white/50"
              style={{ background: location.categoryColor }}
            />
            <p className="font-bold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {location.title}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {location.isVisited && (
              <span className="flex items-center gap-0.5 text-green-600">
                <Eye className="h-3 w-3" />
                Visited
              </span>
            )}
            {location.isFavorite && (
              <span className="flex items-center gap-0.5 text-rose-500">
                <Heart className="h-3 w-3 fill-current" />
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="px-3 pb-3 pt-0">
        <QuickNavButtons
          location={{
            latitude: location.latitude,
            longitude: location.longitude,
            title: location.title,
          }}
          onMore={onNavigateMore}
        />
      </div>
    </div>
  );
}
