"use client";

import { useMemo } from "react";
import { getSolarInfo } from "@/lib/geo/solar";
import { Sunrise, Sunset, Sun } from "lucide-react";

interface Props {
  latitude: number;
  longitude: number;
}

export function SolarInfoCard({ latitude, longitude }: Props) {
  const info = useMemo(() => getSolarInfo(latitude, longitude), [latitude, longitude]);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Sun className="h-3.5 w-3.5" /> Today at this spot
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-amber-500 shrink-0" />
          <div>
            <p className="font-medium tabular-nums">{info.sunrise}</p>
            <p className="text-[10px] text-muted-foreground">Sunrise</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sunset className="h-4 w-4 text-orange-500 shrink-0" />
          <div>
            <p className="font-medium tabular-nums">{info.sunset}</p>
            <p className="text-[10px] text-muted-foreground">Sunset</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none shrink-0">🌅</span>
          <div>
            <p className="font-medium tabular-nums">{info.goldenHourMorning}</p>
            <p className="text-[10px] text-muted-foreground">Golden hour</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none shrink-0">{info.moonPhaseEmoji}</span>
          <div>
            <p className="font-medium text-xs">{info.moonPhaseName}</p>
            <p className="text-[10px] text-muted-foreground">Moon tonight</p>
          </div>
        </div>
      </div>
    </div>
  );
}
