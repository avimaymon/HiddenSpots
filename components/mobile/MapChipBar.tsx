"use client";

import { useTranslations } from "next-intl";
import { LocateFixed, Layers, Radar, Search, Sun, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onMyLocation?: () => void;
  onLayers?: () => void;
  onNearby?: () => void;
  onSearch?: () => void;
  onTools?: () => void;
  onTrailDay?: () => void;
  nearbyActive?: boolean;
  toolsActive?: boolean;
  toolsExpanded?: boolean;
  trailDayActive?: boolean;
}

export function MapChipBar({
  onMyLocation,
  onLayers,
  onNearby,
  onSearch,
  onTools,
  onTrailDay,
  nearbyActive,
  toolsActive,
  toolsExpanded,
  trailDayActive,
}: Props) {
  const t = useTranslations("map");

  const chips = [
    { icon: Search, label: t("searchSpots"), onClick: onSearch, id: "search" },
    { icon: LocateFixed, label: t("myLocation"), onClick: onMyLocation, id: "locate" },
    { icon: Layers, label: t("layers"), onClick: onLayers, id: "layers" },
    {
      icon: Radar,
      label: t("nearby"),
      onClick: onNearby,
      active: nearbyActive,
      id: "nearby",
      pressed: nearbyActive,
    },
    {
      icon: Sun,
      label: trailDayActive ? t("trailDayOn") : t("trailDay"),
      onClick: onTrailDay,
      active: trailDayActive,
      id: "trail",
      pressed: trailDayActive,
    },
    {
      icon: Wrench,
      label: t("fieldTools"),
      onClick: onTools,
      active: toolsActive,
      id: "tools",
      pressed: toolsActive,
      controls: "map-field-tools",
    },
  ];

  // Trail Day: quieter bar — fewer chips, icon-first labels.
  const visible = trailDayActive
    ? chips.filter((c) => c.id === "locate" || c.id === "trail" || c.id === "tools" || c.id === "nearby")
    : chips;

  return (
    <div
      className="md:hidden absolute bottom-[calc(var(--nav-height)+var(--safe-bottom)+4.5rem)] inset-x-0 z-10 px-3 pointer-events-none"
      role="toolbar"
      aria-label={t("fieldToolsTitle")}
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-1">
        {visible.map(({ icon: Icon, label, onClick, active, pressed, controls, id }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={pressed}
            aria-expanded={id === "tools" ? Boolean(toolsExpanded) : undefined}
            aria-controls={id === "tools" && toolsExpanded ? controls : undefined}
            className={cn(
              "flex items-center gap-1.5 shrink-0 h-11 rounded-2xl text-xs font-semibold",
              "glass-strong shadow-float border transition-all active:scale-95",
              trailDayActive ? "px-3" : "px-3.5",
              active
                ? "bg-primary text-primary-foreground border-primary/40 shadow-primary/20"
                : "text-foreground border-border/40 hover:border-primary/30"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {!trailDayActive || id === "trail" ? label : null}
          </button>
        ))}
      </div>
    </div>
  );
}
