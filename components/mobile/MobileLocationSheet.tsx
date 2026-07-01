"use client";

import { Drawer } from "vaul";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function MobileLocationSheet({ open, onOpenChange, children }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-20 bg-black/30 md:hidden" />
        <Drawer.Content
          className={cn(
            "md:hidden fixed inset-x-0 bottom-[calc(var(--nav-height)+var(--safe-bottom))] z-30",
            "flex flex-col max-h-[92dvh] rounded-t-2xl border-t border-border/60 glass-strong"
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/25 shrink-0" />
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
