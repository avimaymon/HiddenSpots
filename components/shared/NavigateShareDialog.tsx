"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Navigation,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  MapPin,
  LocateFixed,
} from "lucide-react";
import {
  type LocationCoords,
  getNavigationLinks,
  getShareText,
  buildWhatsAppShare,
  buildGoogleMapsView,
  buildWazeNavigate,
  buildGpxWaypoint,
  copyToClipboard,
  nativeShare,
} from "@/lib/navigation/external-links";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/use-geolocation";

interface Props {
  location: LocationCoords;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const APP_ICONS: Record<string, string> = {
  waze: "🚗",
  "google-directions": "🗺️",
  "google-maps": "📍",
  "apple-maps": "🍎",
  osm: "🌍",
};

export function NavigateShareDialog({ location, open, onOpenChange }: Props) {
  const t = useTranslations("sharing");
  const [copied, setCopied] = useState<string | null>(null);
  const { distanceTo, loading: geoLoading, refresh } = useGeolocation(open);
  const links = getNavigationLinks(location);
  const distance = distanceTo(location.latitude, location.longitude);

  async function handleCopy(key: string, text: string, label: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(key);
      toast({ title: t("copied"), description: label, variant: "success" });
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast({ title: t("copyFailed"), variant: "destructive" });
    }
  }

  async function handleNativeShare() {
    const ok = await nativeShare(location);
    if (!ok) {
      await handleCopy("share", getShareText(location), t("copyFullText"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            {t("navigateShareTitle")}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {location.title ?? t("locationFallback")}
            {distance && (
              <span className="block mt-1 text-primary font-medium">
                {geoLoading ? t("gettingDistance") : t("distanceFromYou", { distance })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {t("openInApp")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/60 px-3 py-3",
                  "hover:border-primary/30 hover:bg-muted/40 transition-all active:scale-[0.98]",
                  link.featured && "ring-1 ring-primary/10"
                )}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                  style={{ background: `${link.color}18`, border: `1px solid ${link.color}30` }}
                >
                  {APP_ICONS[link.id] ?? "📍"}
                </div>
                <div className="min-w-0 text-start">
                  <p className="text-sm font-bold leading-tight">{link.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{link.description}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ms-auto" />
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {t("shareAndCopy")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <CopyButton
              label={t("copyCoords")}
              sub={`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
              copied={copied === "coords"}
              onClick={() =>
                handleCopy(
                  "coords",
                  `${location.latitude}, ${location.longitude}`,
                  t("copyCoords")
                )
              }
            />
            <CopyButton
              label="Google Maps"
              sub={t("copyLink")}
              copied={copied === "gmaps"}
              onClick={() =>
                handleCopy("gmaps", buildGoogleMapsView(location), t("copyGmaps"))
              }
            />
            <CopyButton
              label="Waze"
              sub={t("copyLink")}
              copied={copied === "waze"}
              onClick={() =>
                handleCopy("waze", buildWazeNavigate(location), t("copyWaze"))
              }
            />
            <CopyButton
              label={t("copyFullText")}
              sub={t("copyAllDetails")}
              copied={copied === "text"}
              onClick={() => handleCopy("text", getShareText(location), t("copyFullText"))}
            />
            <CopyButton
              label="GPX"
              sub={t("copyGpxSub")}
              copied={copied === "gpx"}
              onClick={() =>
                handleCopy("gpx", buildGpxWaypoint(location), t("copyGpx"))
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button className="w-full rounded-xl h-11" onClick={handleNativeShare}>
            <Share2 className="h-4 w-4" />
            {t("shareViaDevice")}
          </Button>
          <Button variant="outline" className="w-full rounded-xl h-11" asChild>
            <a href={buildWhatsAppShare(location)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              {t("shareWhatsApp")}
            </a>
          </Button>
          {!distance && (
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={refresh}>
              <LocateFixed className="h-4 w-4" />
              {t("showDistance")}
            </Button>
          )}
        </div>

        <div className="rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5 flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({
  label,
  sub,
  copied,
  onClick,
}: {
  label: string;
  sub: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 text-start hover:bg-muted/50 transition-all active:scale-[0.98]"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
    </button>
  );
}
