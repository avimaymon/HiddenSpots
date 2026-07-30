"use client";

import { useTranslations } from "next-intl";
import { LocateFixed, Layers, Radar, Search, Ruler, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onMyLocation?: () => void;
  onLayers?: () => void;
  onNearby?: () => void;
  onSearch?: () => void;
  onMeasure?: () => void;
  onRadius?: () => void;
  nearbyActive?: boolean;
  measureActive?: boolean;
  radiusActive?: boolean;
}

export function MapChipBar({
  onMyLocation,
  onLayers,
  onNearby,
  onSearch,
  onMeasure,
  onRadius,
  nearbyActive,
  measureActive,
  radiusActive,
}: Props) {
  const t = useTranslations("map");

  const chips = [
    { icon: Search, label: t("searchSpots"), onClick: onSearch },
    { icon: LocateFixed, label: t("myLocation"), onClick: onMyLocation },
    { icon: Layers, label: t("layers"), onClick: onLayers },
    { icon: Radar, label: t("nearby"), onClick: onNearby, active: nearbyActive },
    { icon: Ruler, label: t("measure"), onClick: onMeasure, active: measureActive },
    { icon: CircleDot, label: t("radiusSearch"), onClick: onRadius, active: radiusActive },
  ];

  return (
    <div className="md:hidden absolute bottom-[calc(var(--nav-height)+var(--safe-bottom)+4.5rem)] inset-x-0 z-10 px-3 pointer-events-none">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-1">
        {chips.map(({ icon: Icon, label, onClick, active }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={cn(
              "flex items-center gap-1.5 shrink-0 h-11 px-3.5 rounded-2xl text-xs font-semibold",
              "glass-strong shadow-float border transition-all active:scale-95",
              active
                ? "bg-primary text-primary-foreground border-primary/40 shadow-primary/20"
                : "text-foreground border-border/40 hover:border-primary/30"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
