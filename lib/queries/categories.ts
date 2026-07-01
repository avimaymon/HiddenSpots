import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export function getCategoriesForUser(userId: string) {
  return unstable_cache(
    async () =>
      prisma.category.findMany({
        where: { OR: [{ userId }, { isSystem: true }] },
        select: { id: true, name: true, color: true, icon: true },
        orderBy: { name: "asc" },
      }),
    [`categories-${userId}`],
    { revalidate: 300, tags: [`categories-${userId}`] }
  )();
}
