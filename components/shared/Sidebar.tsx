"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  Map, List, FolderOpen, Route, LayoutDashboard,
  Settings, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/shared/AppLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/app", icon: Map, labelKey: "map" as const },
  { href: "/locations", icon: List, labelKey: "locations" as const },
  { href: "/collections", icon: FolderOpen, labelKey: "collections" as const },
  { href: "/trips", icon: Route, labelKey: "trips" as const },
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" as const },
];

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? "he";
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations("nav");

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex flex-col relative border-r border-border/60 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-out shrink-0",
          collapsed ? "w-[4.5rem]" : "w-[var(--sidebar-width)]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center px-4 py-5 border-b border-border/50",
            collapsed ? "justify-center px-2" : "gap-0"
          )}
        >
          <AppLogo size="sm" showText={!collapsed} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
            const label = t(labelKey);
            const active =
              pathname === href || (href !== "/app" && pathname.startsWith(href));
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-transform",
                        !active && "group-hover:scale-110"
                      )}
                    />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2.5 pb-4 space-y-1 border-t border-border/50 pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all",
                  collapsed && "justify-center px-2"
                )}
              >
                <Settings className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{t("settings")}</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{t("settings")}</TooltipContent>}
          </Tooltip>

          <div
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/40",
              collapsed && "justify-center px-2"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {user.name?.charAt(0) ?? user.email?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{user.name ?? "Explorer"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => signOut({ callbackUrl: `/${locale}/signin` })}
                  title={t("signOut")}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[4.5rem] z-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-muted hover:shadow-lg transition-all"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
