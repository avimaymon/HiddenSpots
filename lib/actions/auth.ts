"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { seedSystemCategories } from "@/lib/auth/system-categories";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function registerUser(data: unknown) {
  const validated = signupSchema.parse(data);
  const existing = await prisma.user.findUnique({ where: { email: validated.email } });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(validated.password, 12);
  const useFreeMap =
    !process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const user = await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      passwordHash,
      locale: "he",
      ...(useFreeMap ? { mapProvider: "LEAFLET" as const } : {}),
    },
  });

  await seedSystemCategories(prisma, user.id);

  return { id: user.id, email: user.email };
}
