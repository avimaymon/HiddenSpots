"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type LocationCoords,
  buildWazeNavigate,
  buildGoogleMapsDirections,
  buildGoogleMapsView,
} from "@/lib/navigation/external-links";

interface Props {
  location: LocationCoords;
  size?: "sm" | "md";
  className?: string;
  onMore?: () => void;
}

/** Compact Waze + Google buttons for popups and cards */
export function QuickNavButtons({ location, size = "sm", className, onMore }: Props) {
  const t = useTranslations("sharing");
  const btnClass =
    size === "sm"
      ? "h-7 px-2 text-[10px] gap-1"
      : "h-8 px-2.5 text-xs gap-1.5";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <a
        href={buildWazeNavigate(location)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={t("openInWaze")}
        className={cn(
          "inline-flex items-center rounded-lg font-bold transition-all hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          btnClass,
          "bg-[#33CCFF]/15 text-[#0099CC] border border-[#33CCFF]/30"
        )}
      >
        Waze
      </a>
      <a
        href={buildGoogleMapsDirections(location)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={t("openInGoogle")}
        className={cn(
          "inline-flex items-center rounded-lg font-bold transition-all hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          btnClass,
          "bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/30"
        )}
      >
        Google
      </a>
      <a
        href={buildGoogleMapsView(location)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center rounded-lg font-semibold transition-all hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          btnClass,
          "bg-muted/80 text-muted-foreground border border-border/60"
        )}
        title={t("viewOnMap")}
        aria-label={t("viewOnMap")}
      >
        <MapPin className="h-3 w-3" aria-hidden />
      </a>
      {onMore && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMore();
          }}
          aria-label={t("moreOptions")}
          className={cn(
            "inline-flex items-center rounded-lg font-semibold transition-all hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            btnClass,
            "text-muted-foreground border border-border/60"
          )}
        >
          ···
        </button>
      )}
    </div>
  );
}
