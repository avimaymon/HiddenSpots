/** Default collections for new users — Hebrew names (product locale). */
export const STARTER_COLLECTIONS = [
  { name: "מועדפים", color: "#ef4444", icon: "heart" },
  { name: "לראות", color: "#3b82f6", icon: "eye" },
  { name: "פנינים", color: "#14b8a6", icon: "gem" },
] as const;

/**
 * Deterministic idempotency key per starter collection.
 *
 * Reuses the `clientId` column and its `@@unique([userId, clientId])`, so the
 * database enforces "one of each per user" without imposing a global
 * unique-name rule — users remain free to name their own collections whatever
 * they like, including these names.
 */
export function starterCollectionKey(name: string): string {
  return `starter:${name}`;
}

type CollectionClient = {
  collection: {
    createMany: (args: {
      data: {
        userId: string;
        clientId: string;
        name: string;
        color: string;
        icon: string;
      }[];
      skipDuplicates: boolean;
    }) => Promise<{ count: number }>;
    updateMany: (args: {
      where: { userId: string; name: string; clientId: null };
      data: { clientId: string };
    }) => Promise<{ count: number }>;
  };
};

/**
 * Seed the starter collections. Safe to call on signup and again at onboarding.
 *
 * Previously a check-then-insert loop with nothing enforcing uniqueness, so
 * two concurrent calls — signup and `markOnboarded` can overlap — both saw "no
 * rows" and both inserted, leaving new users with a duplicated starter set on
 * their very first screen. The comment claimed idempotency the code could not
 * deliver: a read followed by a write is not atomic.
 *
 * `skipDuplicates` moves that guarantee to the database, where concurrent
 * callers cannot race past it, and collapses the loop to one statement.
 */
export async function seedStarterCollections(
  prisma: CollectionClient,
  userId: string
): Promise<void> {
  // Adopt any pre-existing starter rows created before the key existed, so
  // seeding an older account does not duplicate what is already there.
  for (const c of STARTER_COLLECTIONS) {
    await prisma.collection.updateMany({
      where: { userId, name: c.name, clientId: null },
      data: { clientId: starterCollectionKey(c.name) },
    });
  }

  await prisma.collection.createMany({
    data: STARTER_COLLECTIONS.map((c) => ({
      userId,
      clientId: starterCollectionKey(c.name),
      name: c.name,
      color: c.color,
      icon: c.icon,
    })),
    skipDuplicates: true,
  });
}
