"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getNotifications, markAllRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { formatDistanceToNow } from "date-fns";

type Notification = Awaited<ReturnType<typeof getNotifications>>[0];

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await getNotifications();
      if (!cancelled) setNotifs(data);
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  async function handleOpen(v: boolean) {
    setOpen(v);
    if (v && unread > 0) {
      await markAllRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-3 py-2.5 border-b border-border/50 font-semibold text-sm">Notifications</div>
        <div className="max-h-80 overflow-auto">
          {notifs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "px-3 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors",
                  !n.read && "bg-primary/5"
                )}
              >
                {n.href ? (
                  <Link href={n.href} onClick={() => setOpen(false)}>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  </>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
