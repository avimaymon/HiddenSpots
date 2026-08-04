"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncQueue } from "@/hooks/use-sync-queue";
import { toast } from "@/hooks/use-toast";

export function OfflineBanner() {
  const t = useTranslations("pwa");
  const panelId = useId();
  const [offline, setOffline] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { pending, failed, lastError, syncing, flush, dropStuck } = useSyncQueue();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline && pending === 0 && failed === 0) return null;

  const showFail = failed > 0 && !offline;
  const summary = offline
    ? `${t("offlineBanner")}${pending > 0 ? ` · ${t("syncPending", { count: pending })}` : ""}`
    : showFail
      ? t("syncFailed", { count: failed })
      : syncing
        ? t("syncing")
        : t("syncPending", { count: pending });

  return (
    <div className="fixed top-0 inset-x-0 z-50 safe-area-pt">
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 text-white text-xs font-medium py-2 px-4 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        style={{
          background: offline ? "#d97706" : showFail ? "#dc2626" : "#16a34a",
        }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <span className="sr-only" role="status">
          {summary}
        </span>
        {offline ? (
          <>
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span aria-hidden>{t("offlineBanner")}</span>
            {pending > 0 && (
              <span className="ms-1 opacity-80" aria-hidden>
                · {t("syncPending", { count: pending })}
              </span>
            )}
            <span className="ms-1 opacity-60" aria-hidden>
              {expanded ? "▴" : "▾"}
            </span>
          </>
        ) : showFail ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span aria-hidden>{t("syncFailed", { count: failed })}</span>
            <span className="ms-1 opacity-60" aria-hidden>
              {expanded ? "▴" : "▾"}
            </span>
          </>
        ) : (
          <>
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`}
              aria-hidden
            />
            <span aria-hidden>{syncing ? t("syncing") : t("syncPending", { count: pending })}</span>
            <span className="ms-1 opacity-60" aria-hidden>
              {expanded ? "▴" : "▾"}
            </span>
          </>
        )}
      </button>

      {expanded && (
        <div
          id={panelId}
          className="px-4 py-3 text-xs space-y-2 text-white"
          style={{ background: offline ? "#b45309" : showFail ? "#b91c1c" : "#15803d" }}
        >
          {offline && (
            <>
              <p className="font-semibold opacity-90">{t("offlineUnavailableTitle")}</p>
              <ul className="list-disc list-inside opacity-80 space-y-0.5">
                <li>{t("offlineUnavailableMaps")}</li>
                <li>{t("offlineUnavailableShare")}</li>
                <li>{t("offlineUnavailableWeather")}</li>
              </ul>
            </>
          )}
          {(pending > 0 || failed > 0) && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 rounded-lg text-xs"
                disabled={syncing || offline}
                onClick={async (e) => {
                  e.stopPropagation();
                  const r = await flush();
                  toast({
                    title: r.failed ? t("syncPartial") : t("synced"),
                    description: r.failed
                      ? t("syncFailed", { count: r.failed })
                      : undefined,
                    variant: r.failed ? "destructive" : "success",
                  });
                }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {t("retrySync")}
              </Button>
              {failed > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-xs text-white hover:bg-white/10"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const n = await dropStuck();
                    toast({ title: t("droppedStuck", { count: n }) });
                  }}
                >
                  {t("dropStuck")}
                </Button>
              )}
            </div>
          )}
          {lastError && (
            <p className="opacity-70 font-mono truncate" title={lastError}>
              {lastError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
