import { prisma } from "@/lib/db";

/** Internal only — never export from a "use server" file as a public action. */
export async function writeNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  href?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, body, href },
  });
}
