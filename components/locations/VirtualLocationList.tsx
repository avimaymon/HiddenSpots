"use client";

import { useRef, type ComponentProps } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LocationCard } from "@/components/locations/LocationCard";

type LocationRow = ComponentProps<typeof LocationCard>["location"];

interface Props {
  locations: LocationRow[];
}

const ROW_HEIGHT = 96;

export function VirtualLocationList({ locations }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: locations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="min-h-[60dvh] max-h-full overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            className="absolute inset-x-0 pb-2"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            <LocationCard location={locations[item.index]} view="list" />
          </div>
        ))}
      </div>
    </div>
  );
}
