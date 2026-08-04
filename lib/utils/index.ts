import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { he, enUS } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Escape text for safe interpolation into HTML (print cards, etc.). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Locale-aware date-fns format (Hebrew-first). */
export function formatLocalizedDate(
  date: Date | string | number,
  pattern: string,
  locale = "he"
): string {
  const d = date instanceof Date ? date : new Date(date);
  return format(d, pattern, { locale: locale.startsWith("he") ? he : enUS });
}

/** Hebrew-first units; pass `en` for English secondary locale. */
export function formatDistance(meters: number, locale = "he"): string {
  const he = locale.startsWith("he");
  if (meters < 1000) return he ? `${Math.round(meters)} מ׳` : `${Math.round(meters)}m`;
  const km = (meters / 1000).toFixed(1);
  return he ? `${km} ק״מ` : `${km}km`;
}

/** Hebrew-first duration; pass `en` for English. */
export function formatDuration(minutes: number, locale = "he"): string {
  const he = locale.startsWith("he");
  if (minutes < 60) return he ? `${minutes} דק׳` : `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (he) return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function getDistanceBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Random offset within radius (tests / one-off). Prefer fuzzyCoordsStable for shares. */
export function fuzzyCoords(
  lat: number,
  lng: number,
  radiusMeters = 500
): { latitude: number; longitude: number } {
  const radiusDeg = radiusMeters / 111320;
  const angle = Math.random() * 2 * Math.PI;
  const r = radiusDeg * Math.sqrt(Math.random());
  return {
    latitude: lat + r * Math.cos(angle),
    longitude: lng + r * Math.sin(angle),
  };
}

/** Deterministic fuzz so the same share token always shows the same pin. */
export function fuzzyCoordsStable(
  lat: number,
  lng: number,
  radiusMeters: number,
  seed: string
): { latitude: number; longitude: number } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u1 = ((h >>> 0) % 10_000) / 10_000;
  const u2 = (((h * 33) >>> 0) % 10_000) / 10_000;
  const radiusDeg = radiusMeters / 111320;
  const angle = u1 * 2 * Math.PI;
  const r = radiusDeg * Math.sqrt(Math.max(u2, 0.05));
  return {
    latitude: lat + r * Math.cos(angle),
    longitude: lng + r * Math.sin(angle),
  };
}

export const CATEGORY_COLORS: Record<string, string> = {
  spring: "#06b6d4",
  waterfall: "#3b82f6",
  viewpoint: "#8b5cf6",
  hiking: "#22c55e",
  beach: "#f59e0b",
  picnic: "#84cc16",
  camping: "#f97316",
  bike: "#ec4899",
  photography: "#a855f7",
  fishing: "#0891b2",
  sunrise: "#fb923c",
  sunset: "#f43f5e",
  hidden: "#14b8a6",
  other: "#6b7280",
};
