"use client";

import { useParams } from "next/navigation";
import { he, enUS } from "date-fns/locale";
import { format as dateFnsFormat } from "date-fns";

/** Returns a `format()` that auto-uses the correct date-fns locale. */
export function useLocaleDate() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const dateFnsLocale = locale === "he" ? he : enUS;
  return (date: Date | number, fmt: string) =>
    dateFnsFormat(date, fmt, { locale: dateFnsLocale });
}
