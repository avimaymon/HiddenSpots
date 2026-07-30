/**
 * Extract Google My Maps document id from a pasteable URL or raw mid.
 * Supports:
 *   https://www.google.com/maps/d/viewer?mid=XXXX
 *   https://www.google.com/maps/d/edit?mid=XXXX
 *   https://www.google.com/maps/d/u/0/viewer?mid=XXXX&usp=sharing
 *   raw mid string
 */
export function extractMyMapsMid(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const mid = url.searchParams.get("mid");
    if (mid) return mid;
    // path form …/d/viewer/XXXX rarely used
    const m = url.pathname.match(/\/d\/(?:u\/\d+\/)?(?:viewer|edit|ms)\/([^/?#]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]);
  } catch {
    // not a URL — treat as mid if it looks like one
  }

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

export function myMapsKmlUrl(mid: string): string {
  const u = new URL("https://www.google.com/maps/d/kml");
  u.searchParams.set("forcekml", "1");
  u.searchParams.set("mid", mid);
  return u.toString();
}
