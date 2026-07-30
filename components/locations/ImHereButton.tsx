"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createVisit } from "@/lib/actions/visits";
import { toast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getDistanceBetween, formatDistance, cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

interface Props {
  locationId: string;
  latitude: number;
  longitude: number;
  onLogged?: () => void;
  className?: string;
  /** Max distance (m) before we warn but still allow */
  warnBeyondM?: number;
}

export function ImHereButton({
  locationId,
  latitude,
  longitude,
  onLogged,
  className,
  warnBeyondM = 500,
}: Props) {
  const t = useTranslations("visits");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const { latitude: lat, longitude: lng, refresh } = useGeolocation(true);

  const dist =
    lat != null && lng != null
      ? getDistanceBetween(lat, lng, latitude, longitude)
      : null;

  function handleClick() {
    startTransition(async () => {
      try {
        if (lat == null || lng == null) await refresh();
        await createVisit({
          locationId,
          visitedAt: new Date().toISOString(),
        });
        setDone(true);
        track("visit", { method: "im_here" });
        toast({
          title: t("logged"),
          description: dist != null ? formatDistance(dist) : undefined,
          variant: "success",
        });
        onLogged?.();
      } catch {
        toast({ title: t("logFailed"), variant: "destructive" });
      }
    });
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Button
        type="button"
        onClick={handleClick}
        disabled={isPending || done}
        className="w-full rounded-xl h-12 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        {done ? t("imHereDone") : t("imHere")}
      </Button>
      {dist != null && dist > warnBeyondM && !done && (
        <p className="text-[11px] text-amber-600 text-center">
          {t("imHereFar", { distance: formatDistance(dist) })}
        </p>
      )}
    </div>
  );
}
