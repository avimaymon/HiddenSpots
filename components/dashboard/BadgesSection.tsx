"use client";

import { useTranslations } from "next-intl";
import { ALL_BADGES, type Badge } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface Props {
  earnedIds: string[];
}

export function BadgesSection({ earnedIds }: Props) {
  const t = useTranslations("dashboard.badges");
  const earned = new Set(earnedIds);
  return (
    <div>
      <p className="text-sm font-bold mb-3 flex items-center gap-1.5">🏅 {t("title")}</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {ALL_BADGES.map((badge) => (
          <BadgePill key={badge.id} badge={badge} earned={earned.has(badge.id)} t={t} />
        ))}
      </div>
    </div>
  );
}

function BadgePill({
  badge,
  earned,
  t,
}: {
  badge: Badge;
  earned: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      title={t(badge.descriptionKey)}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all",
        earned
          ? "border-primary/25 bg-primary/5"
          : "border-border/40 bg-muted/20 opacity-40 grayscale"
      )}
    >
      <span className="text-2xl">{badge.emoji}</span>
      <p className="text-[10px] font-semibold leading-tight">{t(badge.nameKey)}</p>
    </div>
  );
}
