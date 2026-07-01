"use client";

import { MAP_STYLES } from "@/lib/map/types";
import type { MapProvider } from "@/lib/map/types";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import { useState } from "react";

interface Props {
  provider: MapProvider;
  currentStyle: string;
  onStyleChange: (style: string) => void;
}

export function MapStyleSwitcher({ provider, currentStyle, onStyleChange }: Props) {
  const [open, setOpen] = useState(false);
  const styles = MAP_STYLES[provider];

  return (
    <div className="absolute bottom-8 left-4 z-10">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium shadow-md hover:bg-muted transition-colors"
          title="Change map style"
        >
          <Layers className="h-3.5 w-3.5" />
          {styles.find((s) => s.id === currentStyle)?.label ?? "Style"}
        </button>

        {open && (
          <div className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-xl shadow-2xl p-1 min-w-[140px] animate-fade-in">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => { onStyleChange(style.id); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-left transition-colors",
                  style.id === currentStyle
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>{style.icon}</span>
                {style.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
