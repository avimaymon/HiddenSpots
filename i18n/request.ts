import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const NAMESPACES = [
  "common",
  "nav",
  "map",
  "locations",
  "collections",
  "trips",
  "visits",
  "sharing",
  "import-export",
  "dashboard",
  "settings",
  "auth",
  "onboarding",
  "errors",
  "validation",
  "pwa",
] as const;

async function loadMessages(locale: string) {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`../messages/${locale}/${ns}.json`);
        return [ns, mod.default] as const;
      } catch {
        return [ns, {}] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "he" | "en")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: await loadMessages(locale),
  };
});
