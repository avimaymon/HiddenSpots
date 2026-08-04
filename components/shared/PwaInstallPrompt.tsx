"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasSavedSpot, HS_HAS_SPOT_KEY } from "@/lib/pwa/first-spot";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/i.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return iOS && webkit && notChrome;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [iosSafari] = useState(() => !isStandalone() && isIosSafari());

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("hs-pwa-dismissed") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
      return;
    }

    const syncEligible = () => setEligible(hasSavedSpot());
    syncEligible();
    window.addEventListener("hs-has-spot", syncEligible);
    window.addEventListener("storage", (e) => {
      if (e.key === HS_HAS_SPOT_KEY) syncEligible();
    });

    const handler = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void> };
      setDeferred({ prompt: () => ev.prompt() });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("hs-has-spot", syncEligible);
    };
  }, []);

  const showIosHint = iosSafari && !deferred;
  if (!eligible || dismissed) return null;
  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed bottom-[calc(var(--nav-height)+var(--safe-bottom)+5rem)] inset-x-3 z-40 md:inset-x-auto md:start-4 md:max-w-sm">
      <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {showIosHint ? t("iosInstallTitle") : t("installTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {showIosHint ? t("iosInstallHint") : t("installHint")}
          </p>
        </div>
        {deferred ? (
          <Button
            size="sm"
            className="rounded-xl shrink-0"
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
            }}
          >
            <Download className="h-3.5 w-3.5" /> {t("install")}
          </Button>
        ) : (
          <span
            className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
            aria-hidden
          >
            <Share className="h-4 w-4" />
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-xl shrink-0"
          onClick={() => {
            localStorage.setItem("hs-pwa-dismissed", "1");
            setDismissed(true);
          }}
        >
          {t("dismiss")}
        </Button>
      </div>
    </div>
  );
}
