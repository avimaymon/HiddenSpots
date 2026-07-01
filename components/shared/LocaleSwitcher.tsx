"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/routing";
import { updateLocale } from "@/lib/actions/settings";

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  async function handleChange(next: string) {
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    await updateLocale(next as Locale);
    router.replace(pathname, { locale: next as Locale });
  }

  return (
    <div className="space-y-2">
      <Label>{t("language")}</Label>
      <Select value={locale} onValueChange={handleChange}>
        <SelectTrigger className="rounded-xl h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="he">{t("hebrew")}</SelectItem>
          <SelectItem value="en">{t("english")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
