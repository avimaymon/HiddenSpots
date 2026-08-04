"use client";

import { useLocale } from "next-intl";
import { directionForLocale, type Direction } from "@/lib/i18n/direction";

/**
 * Current text direction.
 *
 * Derived from the active locale rather than read from `document.dir` in an
 * effect. The previous version returned "ltr" on first render and corrected
 * itself afterwards, so on Hebrew — the default locale — every consumer
 * animated in from the wrong edge for a frame before snapping across. It also
 * could not have matched during SSR, where there is no document to read.
 *
 * `<html dir>` comes from the same helper, so the two cannot disagree.
 */
export function useDir(): Direction {
  return directionForLocale(useLocale());
}
