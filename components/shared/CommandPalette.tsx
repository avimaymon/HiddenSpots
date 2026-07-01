"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Command } from "cmdk";
import {
  Map, List, FolderOpen, Route, LayoutDashboard, Settings,
  Plus, Footprints, Download, Upload, Search,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PAGES = [
  { href: "/app", icon: Map, labelKey: "map" as const },
  { href: "/locations", icon: List, labelKey: "locations" as const },
  { href: "/collections", icon: FolderOpen, labelKey: "collections" as const },
  { href: "/trips", icon: Route, labelKey: "trips" as const },
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/visits", icon: Footprints, labelKey: "visits" as const },
  { href: "/settings", icon: Settings, labelKey: "settings" as const },
  { href: "/import", icon: Upload, labelKey: "import" as const },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("nav");
  const tc = useTranslations("command");

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-lg rounded-2xl">
        <Command className="rounded-2xl">
          <div className="flex items-center border-b border-border/50 px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder={tc("placeholder")}
              className="flex-1 h-12 bg-transparent border-0 outline-none px-3 text-sm"
            />
          </div>
          <Command.List className="max-h-[60dvh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {tc("noResults")}
            </Command.Empty>
            <Command.Group heading={tc("navigation")} className="text-xs text-muted-foreground px-2 py-1.5">
              {PAGES.map(({ href, icon: Icon, labelKey }) => (
                <Command.Item
                  key={href}
                  value={t(labelKey)}
                  onSelect={() => go(href)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer",
                    "aria-selected:bg-primary/10 aria-selected:text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey)}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading={tc("actions")} className="text-xs text-muted-foreground px-2 py-1.5 mt-1">
              <Command.Item
                value="add spot"
                onSelect={() => go("/app")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-primary/10"
              >
                <Plus className="h-4 w-4" /> {t("addSpot")}
              </Command.Item>
              <Command.Item
                value="import"
                onSelect={() => go("/settings")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-primary/10"
              >
                <Upload className="h-4 w-4" /> Import
              </Command.Item>
              <Command.Item
                value="export"
                onSelect={() => go("/settings")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer aria-selected:bg-primary/10"
              >
                <Download className="h-4 w-4" /> Export
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
