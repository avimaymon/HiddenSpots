export type Direction = "ltr" | "rtl";

/** Locales written right-to-left. */
const RTL_LOCALES = new Set(["he"]);

/**
 * Text direction for a locale.
 *
 * Single source of truth for both the `<html dir>` attribute and the `useDir`
 * hook, so a component's idea of the direction can never disagree with the
 * document's.
 */
export function directionForLocale(locale: string): Direction {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

export function isRtlLocale(locale: string): boolean {
  return directionForLocale(locale) === "rtl";
}
