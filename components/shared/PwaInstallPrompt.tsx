"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasSavedSpot, HS_HAS_SPOT_KEY } from "@/lib/pwa/first-spot";

export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
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

  if (!eligible || !deferred || dismissed) return null;

  return (
    <div className="fixed bottom-[calc(var(--nav-height)+var(--safe-bottom)+5rem)] inset-x-3 z-40 md:inset-x-auto md:start-4 md:max-w-sm">
      <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{t("installTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("installHint")}</p>
        </div>
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
