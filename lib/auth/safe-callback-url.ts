/**
 * Allow only same-app relative paths under /he or /en.
 * Blocks open redirects via callbackUrl.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/he/app"
): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (!/^\/(he|en)(\/|$)/.test(trimmed)) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("@")) return fallback;
  return trimmed;
}
