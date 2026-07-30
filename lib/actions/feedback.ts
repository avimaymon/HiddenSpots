"use server";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const feedbackSchema = z.object({
  message: z.string().trim().min(3).max(2000),
  page: z.string().max(200).optional(),
  locale: z.string().max(10).optional(),
});

export async function submitFeedback(data: unknown) {
  const parsed = feedbackSchema.parse(data);
  const session = await auth();
  const userId = session?.user?.id;

  const key = userId ?? "anon";
  const { ok } = await rateLimit(`feedback:${key}`, 5, 60_000);
  if (!ok) throw new Error("RATE_LIMITED");

  return prisma.feedback.create({
    data: {
      userId: userId ?? null,
      message: parsed.message,
      page: parsed.page,
      locale: parsed.locale,
    },
    select: { id: true },
  });
}
