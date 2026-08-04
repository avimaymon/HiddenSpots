"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const APP_VERSION = "2.1.0";
const STORAGE_KEY = "hiddenspots_seen_version";

const ITEM_KEYS = ["tracks", "offline", "drive", "badges", "sun"] as const;
const EMOJIS: Record<(typeof ITEM_KEYS)[number], string> = {
  tracks: "🥾",
  offline: "📶",
  drive: "☁️",
  badges: "🏅",
  sun: "☀️",
};

export function WhatsNewModal() {
  const t = useTranslations("whatsnew");
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) !== APP_VERSION
  );

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">✨ {t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {ITEM_KEYS.map((key) => (
            <div key={key} className="flex items-start gap-3">
              <span className="text-2xl shrink-0 leading-none">{EMOJIS[key]}</span>
              <div>
                <p className="text-sm font-semibold">{t(`items.${key}.title`)}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(`items.${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button className="w-full rounded-xl" onClick={dismiss}>{t("gotIt")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
