import { z } from "zod";

export const locationSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  address: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  categoryId: z.string().optional(),
  isFavorite: z.boolean().default(false),
  isBucketList: z.boolean().default(false),
  difficulty: z.enum(["EASY", "MODERATE", "HARD", "EXPERT"]).optional(),
  accessibility: z.string().max(500).optional(),
  hasParking: z.boolean().optional(),
  hasWater: z.boolean().optional(),
  hasShade: z.boolean().optional(),
  cellularQuality: z
    .enum(["NONE", "POOR", "FAIR", "GOOD", "EXCELLENT"])
    .optional(),
  isFamilyFriendly: z.boolean().optional(),
  isDogFriendly: z.boolean().optional(),
  isCampingAllowed: z.boolean().optional(),
  recommendedSeasons: z.array(z.string()).default([]),
  recommendedHours: z.string().max(200).optional(),
  bestTimeToVisit: z.string().max(500).optional(),
  privateNotes: z.string().max(10000).optional(),
  externalLinks: z.array(z.string().url()).default([]),
  privacy: z.enum(["PRIVATE", "SHARED", "PUBLIC", "SECRET"]).default("PRIVATE"),
  fuzzyCoordinates: z.boolean().default(false),
  fuzzyRadiusMeters: z.number().default(500),
  tips: z.string().max(2000).optional(),
  vibes: z.array(z.string()).default([]),
  hazardNote: z.string().max(500).optional(),
  hazardExpiresAt: z.string().optional(),
  accessibilityLevel: z.string().optional(),
});

export type LocationFormData = z.infer<typeof locationSchema>;

export const collectionSchema = z.object({
  clientId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  icon: z.string().default("folder"),
  privacy: z.enum(["PRIVATE", "SHARED", "PUBLIC", "SECRET"]).default("PRIVATE"),
  parentId: z.string().nullable().optional(),
});

export const visitSchema = z.object({
  clientId: z.string().optional(),
  locationId: z.string(),
  visitedAt: z.string().or(z.date()),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
  weather: z.string().max(200).optional(),
  duration: z.number().min(0).optional(),
  companions: z.array(z.string()).default([]),
});

export const tripSchema = z.object({
  clientId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f59e0b"),
  privacy: z.enum(["PRIVATE", "SHARED", "PUBLIC", "SECRET"]).default("PRIVATE"),
});

/**
 * A share targets exactly one resource. More than one is a privacy hazard: the
 * public share page renders whichever branch it finds, and a second resource
 * riding along has no UI that would ever show it to the owner.
 */
export const shareSchema = z
  .object({
    permission: z.enum(["VIEW", "COMMENT", "EDIT", "MANAGE"]).default("VIEW"),
    sharedWithEmail: z.string().email().optional(),
    expiresAt: z.string().optional(),
    locationId: z.string().optional(),
    collectionId: z.string().optional(),
    tripId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const count = [v.locationId, v.collectionId, v.tripId].filter(Boolean).length;
    if (count !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "EXACTLY_ONE_RESOURCE",
        path: ["locationId"],
      });
    }
  });
