/** Default collections for new users — Hebrew names (product locale). */
export const STARTER_COLLECTIONS = [
  { name: "מועדפים", color: "#ef4444", icon: "heart" },
  { name: "לראות", color: "#3b82f6", icon: "eye" },
  { name: "פנינים", color: "#14b8a6", icon: "gem" },
] as const;

type CollectionClient = {
  collection: {
    findFirst: (args: {
      where: { userId: string; name: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
    create: (args: {
      data: {
        userId: string;
        name: string;
        color: string;
        icon: string;
      };
    }) => Promise<unknown>;
  };
};

/** Idempotent seed — safe to call on signup and onboarding finish. */
export async function seedStarterCollections(
  prisma: CollectionClient,
  userId: string
): Promise<void> {
  for (const c of STARTER_COLLECTIONS) {
    const exists = await prisma.collection.findFirst({
      where: { userId, name: c.name },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.collection.create({
      data: {
        userId,
        name: c.name,
        color: c.color,
        icon: c.icon,
      },
    });
  }
}
