"use client";

import { useMapStore } from "@/lib/store/map";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  collections: { id: string; name: string; color: string; _count: { locations: number } }[];
  onClose: () => void;
}

export function MapSidebar({ collections, onClose }: Props) {
  const { activeCollectionIds, toggleCollection, showClusters, setShowClusters } =
    useMapStore();

  return (
    <div className="h-full glass-strong flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
        <div className="flex items-center gap-2.5 font-bold text-sm">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          Map Layers
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-xl">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Display
            </p>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5">
              <span className="text-sm font-medium">Cluster markers</span>
              <Switch checked={showClusters} onCheckedChange={setShowClusters} />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Collections
            </p>
            {collections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No collections yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Group spots into custom lists</p>
              </div>
            ) : (
              <div className="space-y-1">
                {collections.map((col) => {
                  const active = activeCollectionIds.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      onClick={() => toggleCollection(col.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-start",
                        active
                          ? "bg-primary/12 text-primary border border-primary/20 shadow-sm"
                          : "hover:bg-muted/60 border border-transparent"
                      )}
                    >
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-background shadow-sm"
                        style={{ background: col.color }}
                      />
                      <span className="flex-1 truncate font-medium">{col.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums bg-muted/50 px-1.5 py-0.5 rounded-md">
                        {col._count.locations}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
