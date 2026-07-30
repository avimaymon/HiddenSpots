"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/shared/AppLogo";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error, reset }: Props) {
  const t = useTranslations("errors");

  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        href: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <div
      id="main-content"
      role="alert"
      className="min-h-[60dvh] flex flex-col items-center justify-center gap-5 p-6 text-center"
    >
      <AppLogo size="sm" />
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
      </div>
      <div className="space-y-2 max-w-sm">
        <h1 className="text-lg font-semibold">{t("somethingWentWrong")}</h1>
        <p className="text-sm text-muted-foreground">{t("tryAgainHint")}</p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground/70" aria-live="polite">
            {t("errorId", { id: error.digest })}
          </p>
        )}
      </div>
      <Button className="rounded-xl" onClick={reset}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        {t("tryAgain")}
      </Button>
    </div>
  );
}
