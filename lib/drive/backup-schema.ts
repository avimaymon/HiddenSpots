import { z } from "zod";

/**
 * Validation for a Google Drive backup before any of it reaches the database.
 *
 * The file lives in the user's own Drive and is fully editable by them, so
 * nothing in it is trustworthy — it is untrusted input that merely happens to
 * arrive over an authenticated channel. The restore path previously
 * `JSON.parse`d it with no size limit and destructured
 * `feature.geometry.coordinates` without checking anything, so a hand-edited
 * file could write NaN latitude/longitude rows that break every map render and
 * cannot be corrected through the UI.
 *
 * Pure and dependency-free so the rules can be tested directly; the action
 * only performs the I/O around it.
 */

/** Refuse to parse a file larger than this. */
export const BACKUP_MAX_BYTES = 8 * 1024 * 1024;

/** Features considered in one restore; the rest is reported, not dropped silently. */
export const RESTORE_FEATURES_MAX = 5_000;

/** Tags accepted per spot — a guard against a file with thousands on one row. */
export const RESTORE_TAGS_PER_FEATURE_MAX = 50;

const PRIVACY = ["PRIVATE", "SHARED", "PUBLIC", "SECRET"] as const;

const finite = (name: string, min: number, max: number) =>
  z
    .number()
    .refine(Number.isFinite, `${name} must be a finite number`)
    .refine((v) => v >= min && v <= max, `${name} out of range`);

/**
 * GeoJSON order is [longitude, latitude] — the reverse of how they are read
 * aloud, and the easiest thing in this file to get backwards.
 */
export const backupFeatureSchema = z.object({
  geometry: z.object({
    coordinates: z.tuple([finite("longitude", -180, 180), finite("latitude", -90, 90)]),
  }),
  properties: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      description: z.string().max(5000).optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      "hs:privacy": z.enum(PRIVACY).optional(),
      "hs:isFavorite": z.boolean().optional(),
      "hs:isBucketList": z.boolean().optional(),
      "hs:isVisited": z.boolean().optional(),
      "hs:tags": z.array(z.string().trim().min(1).max(50)).optional(),
    })
    .partial()
    .optional(),
});

export type BackupFeatureInput = z.infer<typeof backupFeatureSchema>;

/** A feature reduced to exactly what the restore writes. */
export type NormalizedFeature = {
  title: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  isBucketList: boolean;
  isVisited: boolean;
  privacy: (typeof PRIVACY)[number];
  tags: string[];
};

export type ParsedBackup = {
  features: NormalizedFeature[];
  /** Features present in the file, before the cap. */
  total: number;
  /** True when the file held more than RESTORE_FEATURES_MAX. */
  truncated: boolean;
  /** Features dropped because they did not validate. */
  rejected: number;
};

export class BackupTooLargeError extends Error {
  constructor() {
    super("BACKUP_TOO_LARGE");
  }
}

export class BackupUnreadableError extends Error {
  constructor() {
    super("BACKUP_UNREADABLE");
  }
}

function normalize(feature: BackupFeatureInput): NormalizedFeature {
  const [longitude, latitude] = feature.geometry.coordinates;
  const p = feature.properties ?? {};
  return {
    title: p.name?.trim() || "Restored Location",
    description: p.description ?? null,
    address: p.address ?? null,
    latitude,
    longitude,
    isFavorite: p["hs:isFavorite"] ?? false,
    isBucketList: p["hs:isBucketList"] ?? false,
    isVisited: p["hs:isVisited"] ?? false,
    privacy: p["hs:privacy"] ?? "PRIVATE",
    // Deduplicated and capped: the join rows are written with createMany, and
    // a repeated tag would collide on (locationId, tagId).
    tags: Array.from(
      new Set((p["hs:tags"] ?? []).map((t) => t.trim()).filter(Boolean))
    ).slice(0, RESTORE_TAGS_PER_FEATURE_MAX),
  };
}

/**
 * Parse and validate a backup file.
 *
 * Invalid features are counted and skipped rather than aborting the restore:
 * one corrupt row should not cost the user the other 4,999, and reporting the
 * count is more honest than either silence or total failure.
 */
export function parseBackup(raw: string): ParsedBackup {
  if (Buffer.byteLength(raw, "utf8") > BACKUP_MAX_BYTES) {
    throw new BackupTooLargeError();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupUnreadableError();
  }

  const envelope = z
    .object({ locations: z.object({ features: z.array(z.unknown()) }).optional() })
    .safeParse(parsed);

  if (!envelope.success) throw new BackupUnreadableError();

  const raws = envelope.data.locations?.features ?? [];
  const total = raws.length;
  const considered = raws.slice(0, RESTORE_FEATURES_MAX);

  const features: NormalizedFeature[] = [];
  let rejected = 0;
  for (const candidate of considered) {
    const result = backupFeatureSchema.safeParse(candidate);
    if (result.success) features.push(normalize(result.data));
    else rejected++;
  }

  return { features, total, truncated: total > RESTORE_FEATURES_MAX, rejected };
}
