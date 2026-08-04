import { fuzzyCoordsStable } from "@/lib/utils";

export type PublicCategory = {
  name: string;
  nameHe: string | null;
  color: string;
  icon: string;
};

export type PublicPhoto = {
  id: string;
  url: string;
};

/** Explicit allowlist — never spread raw Prisma location rows to clients. */
export type PublicLocationDTO = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  privateNotes: null;
  category: PublicCategory | null;
  photos: PublicPhoto[];
};

type LocInput = {
  id?: string;
  title?: string | null;
  description?: string | null;
  privacy?: string;
  fuzzyCoordinates?: boolean;
  fuzzyRadiusMeters?: number | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  privateNotes?: string | null;
  category?: {
    name?: string;
    nameHe?: string | null;
    color?: string;
    icon?: string;
  } | null;
  photos?: Array<{ id?: string; url?: string } | null> | null;
};

function mapCategory(category: LocInput["category"]): PublicCategory | null {
  if (!category?.name || !category.color || !category.icon) return null;
  return {
    name: category.name,
    nameHe: category.nameHe ?? null,
    color: category.color,
    icon: category.icon,
  };
}

function mapPhotos(photos: LocInput["photos"]): PublicPhoto[] {
  if (!photos?.length) return [];
  const out: PublicPhoto[] = [];
  for (const p of photos) {
    if (!p?.id || !p.url) continue;
    out.push({ id: p.id, url: p.url });
  }
  return out;
}

/**
 * Allowlisted public share DTO; strips privateNotes and fuzzes SECRET / fuzzy coords.
 *
 * `seed` may be a thunk so the caller can defer deriving it — the real deriver
 * is keyed on AUTH_SECRET, and a share of ordinary spots should not depend on
 * that secret just to render.
 */
export function toPublicLocation(
  loc: LocInput,
  seed: string | (() => string)
): PublicLocationDTO {
  let latitude = loc.latitude;
  let longitude = loc.longitude;
  let address: string | null = loc.address ?? null;

  if (loc.privacy === "SECRET" || loc.fuzzyCoordinates) {
    const fuzzed = fuzzyCoordsStable(
      loc.latitude,
      loc.longitude,
      loc.fuzzyRadiusMeters ?? 500,
      typeof seed === "function" ? seed() : seed
    );
    latitude = fuzzed.latitude;
    longitude = fuzzed.longitude;
    address = null;
  }

  return {
    id: loc.id ?? "",
    title: loc.title ?? "",
    description: loc.description ?? null,
    latitude,
    longitude,
    address,
    privateNotes: null,
    category: mapCategory(loc.category),
    photos: mapPhotos(loc.photos),
  };
}

/** Localized category label for share UI (Hebrew-first). */
export function publicCategoryLabel(
  category: PublicCategory | null | undefined,
  locale: string
): string | null {
  if (!category) return null;
  if (locale.startsWith("he") && category.nameHe) return category.nameHe;
  return category.name;
}

/** @deprecated alias — prefer PublicLocationDTO */
export type PublicLocLike = PublicLocationDTO;
