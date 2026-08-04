/**
 * Allowlist photo URLs stored on locations/visits.
 * Rejects tracking pixels and arbitrary remote hosts.
 */
export function isAllowedPhotoUrl(url: string): boolean {
  if (typeof url !== "string" || url.length > 2048) return false;
  if (url.startsWith("/uploads/")) {
    // no path traversal
    if (url.includes("..") || url.includes("//")) return false;
    return /^\/uploads\/[A-Za-z0-9._-]+$/.test(url);
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    // Vercel Blob public hosts
    if (
      u.hostname.endsWith(".public.blob.vercel-storage.com") ||
      u.hostname === "public.blob.vercel-storage.com"
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
