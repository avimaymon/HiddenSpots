"use client";

import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Soft ops hints for solo operators — no secrets exposed.
 * ERROR_WEBHOOK_URL is server-only; we only explain how to wire it.
 */
export function OpsHealthSection() {
  const t = useTranslations("settings");

  return (
    <section className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Activity className="h-4 w-4 text-primary" /> {t("opsTitle")}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{t("opsWebhookHint")}</p>
      <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
        <li>{t("opsSmokeHint")}</li>
        <li>{t("opsDriveHint")}</li>
        <li>
          <Link href="/dashboard" className="text-primary underline-offset-2 hover:underline">
            {t("opsFieldChecklist")}
          </Link>
          {" — "}
          {t("opsFieldChecklistHint")}
        </li>
      </ul>
    </section>
  );
}
