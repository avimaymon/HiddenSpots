"use client";

import { Drawer } from "vaul";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

// ponytail: snap points give "peek" (45%) and "full" (92%) heights.
// Vaul handles the drag handle and momentum natively.
const SNAP_POINTS = ["45%", "92%"] as const;

export function MobileLocationSheet({ open, onOpenChange, children }: Props) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      modal
      snapPoints={SNAP_POINTS as unknown as (string | number)[]}
      fadeFromIndex={0}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-20 bg-black/35 backdrop-blur-[2px] md:hidden" />
        <Drawer.Content
          className={cn(
            "md:hidden fixed inset-x-0 bottom-[calc(var(--nav-height)+var(--safe-bottom))] z-30",
            "flex flex-col max-h-[92dvh] rounded-t-3xl border-t border-border/60 glass-strong shadow-float"
          )}
        >
          {/* Drag handle */}
          <div
            aria-hidden
            className="mx-auto mt-2.5 mb-1 h-1.5 w-11 rounded-full bg-muted-foreground/25 shrink-0 cursor-grab active:cursor-grabbing"
          />
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
