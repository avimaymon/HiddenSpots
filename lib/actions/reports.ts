"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";

const reportSchema = z.object({
  locationId: z.string().min(1).max(64),
  /** Required for public share reports so callers prove visibility. */
  shareToken: z.string().min(1).max(128).optional(),
  reason: z.enum(["INACCURATE", "CLOSED", "DANGEROUS", "INAPPROPRIATE", "DUPLICATE"]),
  details: z.string().max(1000).optional(),
  reporterEmail: z.string().email().optional(),
});

async function assertCanReportLocation(
  locationId: string,
  shareToken: string | undefined,
  userId: string | undefined
): Promise<void> {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    select: { id: true, userId: true, privacy: true },
  });
  if (!loc) throw new Error("Not found");

  if (userId && loc.userId === userId) return;
  if (loc.privacy === "PUBLIC") return;

  if (shareToken) {
    const share = await prisma.share.findUnique({
      where: { publicToken: shareToken },
      select: {
        locationId: true,
        collectionId: true,
        expiresAt: true,
      },
    });
    if (!share) throw new Error("Forbidden");
    if (share.expiresAt && share.expiresAt < new Date()) throw new Error("Forbidden");
    if (share.locationId === locationId) return;
    if (share.collectionId) {
      const member = await prisma.collectionLocation.findFirst({
        where: { collectionId: share.collectionId, locationId },
        select: { locationId: true },
      });
      if (member) return;
    }
  }

  if (userId) {
    const targeted = await prisma.share.findFirst({
      where: {
        locationId,
        sharedWithId: userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (targeted) return;
  }

  throw new Error("Forbidden");
}

export async function submitSpotReport(data: unknown) {
  const parsed = reportSchema.parse(data);
  const session = await auth();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const key = session?.user?.id ?? ip;
  const { ok } = await rateLimit(`spot-report:${key}`, 5, 60 * 60 * 1000, {
    failClosed: true,
  });
  if (!ok) throw new Error("RATE_LIMITED");

  await assertCanReportLocation(
    parsed.locationId,
    parsed.shareToken,
    session?.user?.id
  );

  return prisma.spotReport.create({
    data: {
      locationId: parsed.locationId,
      reason: parsed.reason,
      details: parsed.details,
      userId: session?.user?.id ?? null,
    },
  });
}
