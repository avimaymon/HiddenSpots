"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Map, List, FolderOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Route, LayoutDashboard, Settings, Eye, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

const MAIN_NAV = [
  { href: "/app", icon: Map, labelKey: "map" as const },
  { href: "/locations", icon: List, labelKey: "locations" as const },
  { href: "/collections", icon: FolderOpen, labelKey: "collections" as const },
];

const MORE_NAV = [
  { href: "/trips", icon: Route, labelKey: "trips" as const },
  { href: "/visits", icon: Eye, labelKey: "visits" as const },
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/settings", icon: Settings, labelKey: "settings" as const },
  { href: "/import", icon: Upload, labelKey: "import" as const },
];

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border/50 safe-area-pb">
        <div
          className="flex items-stretch justify-around px-1"
          style={{ minHeight: "var(--nav-height)" }}
        >
          {MAIN_NAV.map(({ href, icon: Icon, labelKey }) => {
            const label = t(labelKey);
            const active =
              pathname === href || (href !== "/app" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 min-w-0 touch-target transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-1 h-1 w-8 rounded-full bg-primary" />
                )}
                <Icon className={cn("h-5 w-5", active && "drop-shadow-sm")} />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </Link>
            );
          })}

          <Sheet>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 min-w-0 touch-target transition-colors",
                  MORE_NAV.some((n) => pathname.startsWith(n.href))
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-semibold tracking-wide">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left font-display">More</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 pb-4">
                {MORE_NAV.map(({ href, icon: Icon, labelKey }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 text-sm font-medium hover:bg-muted/60 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {t(labelKey)}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
