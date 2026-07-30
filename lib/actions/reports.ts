"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";

const reportSchema = z.object({
  locationId: z.string(),
  reason: z.enum(["INACCURATE", "CLOSED", "DANGEROUS", "INAPPROPRIATE", "DUPLICATE"]),
  details: z.string().max(1000).optional(),
  reporterEmail: z.string().email().optional(),
});

export async function submitSpotReport(data: unknown) {
  const parsed = reportSchema.parse(data);
  return prisma.spotReport.create({ data: parsed });
}
