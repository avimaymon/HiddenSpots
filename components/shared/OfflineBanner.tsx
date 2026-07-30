"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff, RefreshCw } from "lucide-react";
import { pendingSyncCount } from "@/lib/offline/db";

export function OfflineBanner() {
  const t = useTranslations("pwa");
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    pendingSyncCount().then(setPending);

    const on = () => { setOffline(false); pendingSyncCount().then(setPending); };
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const [expanded, setExpanded] = useState(false);
  if (!offline && pending === 0) return null;

  const unavailable = [
    "Solar/moon info", "Air quality", "Weather forecast", "Map tiles (new)", "Share/export", "AI features",
  ];

  return (
    <div className="fixed top-0 inset-x-0 z-50 safe-area-pt">
      <div
        className="flex items-center justify-center gap-2 text-white text-xs font-medium py-2 px-4 cursor-pointer select-none"
        style={{ background: offline ? "#d97706" : "#16a34a" }}
        onClick={() => setExpanded((v) => !v)}
      >
        {offline ? (
          <>
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            {t("offlineBanner")}
            {pending > 0 && (
              <span className="ms-1 opacity-80">· {pending} queued ⏳</span>
            )}
            <span className="ms-1 opacity-60">▾</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
            {t("syncing")}
          </>
        )}
      </div>
      {offline && expanded && (
        <div className="bg-amber-700 text-white px-4 py-3 text-xs space-y-1">
          <p className="font-semibold opacity-90">Unavailable offline:</p>
          <ul className="list-disc list-inside opacity-75 space-y-0.5">
            {unavailable.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
