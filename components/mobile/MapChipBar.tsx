"use client";

import { useTranslations } from "next-intl";
import { LocateFixed, Layers, Ruler, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onMyLocation?: () => void;
  onLayers?: () => void;
  onMeasure?: () => void;
  onNearby?: () => void;
  measureActive?: boolean;
  nearbyActive?: boolean;
}

export function MapChipBar({
  onMyLocation,
  onLayers,
  onMeasure,
  onNearby,
  measureActive,
  nearbyActive,
}: Props) {
  const t = useTranslations("map");

  const chips = [
    { icon: LocateFixed, label: t("myLocation"), onClick: onMyLocation },
    { icon: Layers, label: t("layers"), onClick: onLayers },
    { icon: Ruler, label: t("measure"), onClick: onMeasure, active: measureActive },
    { icon: Radar, label: t("nearby"), onClick: onNearby, active: nearbyActive },
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
              "flex items-center gap-1.5 shrink-0 h-11 px-3 rounded-full text-xs font-medium",
              "glass shadow-glass border border-border/40 transition-colors",
              active ? "bg-primary text-primary-foreground border-primary/30" : "text-foreground"
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
