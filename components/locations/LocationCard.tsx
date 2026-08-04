"use client";

import { memo, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Heart, Eye, Bookmark, MapPin, Navigation, Footprints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuickNavButtons } from "@/components/shared/QuickNavButtons";
import { NavigateShareDialog } from "@/components/shared/NavigateShareDialog";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { toggleFavorite } from "@/lib/actions/locations";
import { createVisit } from "@/lib/actions/visits";
import { enqueueSync } from "@/lib/offline/db";
import { toast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDate } from "@/lib/utils";

type LocationRow = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isBucketList: boolean;
  isVisited: boolean;
  visitCount: number;
  createdAt: Date;
  category: { name: string; color: string } | null;
  photos: { url: string }[];
  tags: { tag: { name: string } }[];
};

interface Props {
  location: LocationRow;
  view: "grid" | "list";
  onClick?: () => void;
}

function LocationCardInner({ location, view, onClick }: Props) {
  const t = useTranslations("locations");
  const tv = useTranslations("visits");
  const locale = useLocale();
  const photo = location.photos[0];
  const [shareOpen, setShareOpen] = useState(false);
  const [swipeHint, setSwipeHint] = useState<"fav" | "log" | null>(null);
  const x = useMotionValue(0);
  const bg = useTransform(x, [-80, 0, 80], ["rgba(34,197,94,0.15)", "transparent", "rgba(245,158,11,0.15)"]);
  const coords = {
    latitude: location.latitude,
    longitude: location.longitude,
    title: location.title,
  };

  async function handleSwipeEnd() {
    const xVal = x.get();
    if (xVal > 60) {
      const nextFav = !location.isFavorite;
      if (!navigator.onLine) {
        await enqueueSync(nextFav ? "favorite" : "unfavorite", { locationId: location.id });
        toast({ title: t("savedOffline"), variant: "success" });
      } else {
        await toggleFavorite(location.id);
        toast({
          title: location.isFavorite ? t("favoriteRemoved") : t("favoriteAdded"),
          variant: "success",
        });
      }
    } else if (xVal < -60) {
      const visitPayload = {
        locationId: location.id,
        visitedAt: new Date().toISOString(),
      };
      try {
        if (!navigator.onLine) {
          await enqueueSync("visit", visitPayload);
          toast({ title: tv("logged"), description: t("savedOffline"), variant: "success" });
        } else {
          await createVisit(visitPayload);
          toast({ title: tv("logged"), description: t("visitLoggedDesc"), variant: "success" });
        }
      } catch {
        toast({ title: t("visitFailed"), variant: "destructive" });
      }
    }
    animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    setSwipeHint(null);
  }

  const shareDialog = (
    <NavigateShareDialog location={coords} open={shareOpen} onOpenChange={setShareOpen} />
  );

  if (view === "list") {
    return (
      <>
        <motion.div
          style={{ x, background: bg }}
          drag="x"
          dragConstraints={{ left: -80, right: 80 }}
          onDrag={(_, info) => {
            setSwipeHint(info.offset.x > 30 ? "fav" : info.offset.x < -30 ? "log" : null);
          }}
          onDragEnd={handleSwipeEnd}
          className="relative rounded-2xl overflow-hidden"
        >
          {swipeHint === "fav" && (
            <div className="absolute inset-y-0 right-3 flex items-center text-amber-500">
              <Heart className="h-5 w-5 fill-current" />
            </div>
          )}
          {swipeHint === "log" && (
            <div className="absolute inset-y-0 left-3 flex items-center text-green-500">
              <Footprints className="h-5 w-5" />
            </div>
          )}
        <div className="group flex items-center gap-3 sm:gap-4 p-3 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/25 hover:shadow-md transition-all duration-200">
          <Link href={`/locations/${location.id}`} onClick={onClick} className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden shrink-0 bg-muted ring-1 ring-border/40">
              {photo ? (
                <Image src={photo.url} alt={location.title} fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center gradient-nature">
                  <MapPin className="h-5 w-5 text-primary/60" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {location.title}
                </p>
                {location.isFavorite && (
                  <Heart className="h-3.5 w-3.5 text-rose-500 fill-current shrink-0" />
                )}
                {location.isBucketList && (
                  <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-current shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {location.category && (
                  <Badge
                    variant="outline"
                    style={{ color: location.category.color, borderColor: `${location.category.color}40` }}
                    className="text-[10px] px-2 py-0"
                  >
                    {location.category.name}
                  </Badge>
                )}
                {location.isVisited && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Eye className="h-3 w-3" /> {location.visitCount}x
                  </span>
                )}
              </div>
            </div>
          </Link>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
              {formatLocalizedDate(location.createdAt, "MMM d", locale)}
            </span>
            <QuickNavButtons location={coords} onMore={() => setShareOpen(true)} />
          </div>
        </div>
        </motion.div>
        {shareDialog}
      </>
    );
  }

  return (
    <>
      <div className="group lift-on-hover rounded-2xl overflow-hidden border border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300">
        <Link href={`/locations/${location.id}`} className="block">
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            {photo ? (
              <Image
                src={photo.url}
                alt={location.title}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="h-full flex items-center justify-center gradient-nature">
                <MapPin className="h-10 w-10 text-primary/25" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute top-2 end-2 flex gap-1">
              {location.isFavorite && (
                <div className="h-7 w-7 rounded-full glass flex items-center justify-center">
                  <Heart className="h-3.5 w-3.5 text-rose-500 fill-current" />
                </div>
              )}
              {location.isBucketList && (
                <div className="h-7 w-7 rounded-full glass flex items-center justify-center">
                  <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-current" />
                </div>
              )}
            </div>

            {location.category && (
              <div className="absolute bottom-2 start-2">
                <Badge
                  style={{ background: `${location.category.color}e6`, color: "#fff" }}
                  className="text-[10px] shadow-md border-0 backdrop-blur-sm"
                >
                  {location.category.name}
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3 sm:p-3.5">
            <p className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {location.title}
            </p>
            {location.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {location.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <MapPin className="h-3 w-3 text-primary/60" />
                {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
              </div>
              {location.isVisited && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                  <Eye className="h-3 w-3" />
                  {t("visitCountShort", { count: location.visitCount })}
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="px-3 pb-3 flex items-center justify-between gap-2 border-t border-border/30 bg-muted/10">
          <QuickNavButtons location={coords} onMore={() => setShareOpen(true)} />
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg shrink-0"
            onClick={() => setShareOpen(true)}
            title={t("actionNavigateShare")}
          >
            <Navigation className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {shareDialog}
    </>
  );
}

export const LocationCard = memo(LocationCardInner);
