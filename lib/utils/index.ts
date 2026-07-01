import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
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
