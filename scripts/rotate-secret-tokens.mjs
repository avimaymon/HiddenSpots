/**
 * One-off: reissue share tokens for shares that point at a SECRET spot.
 *
 * Tokens used to default to `cuid()` — timestamp + counter + host fingerprint +
 * a Math.random()-derived block — and the token is the only gate on a shared
 * spot. For SECRET spots that gate is also what the coordinate fuzzing is
 * protecting, so a guessable token there is a real risk and worth breaking
 * links over. Ordinary shares keep their existing tokens; owners can reissue
 * those individually from Settings → Sharing.
 *
 * Owners are notified so they know to resend.
 *
 * Usage:
 *   node scripts/rotate-secret-tokens.mjs --dry-run
 *   node scripts/rotate-secret-tokens.mjs
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

/** Must match lib/shares/token.ts. */
const newShareToken = () => randomBytes(32).toString("base64url");

/**
 * A token this script (or lib/shares/token.ts) already issued: 32 random bytes
 * as base64url, always 43 chars. Skipping these makes re-running safe.
 *
 * Rotating unconditionally meant a second run broke every link a *second* time
 * and sent every owner a second "resend your link" notice — including owners
 * who had already dealt with the first. Since the runbook tells operators to
 * do a dry run and then the real thing, re-running after an interruption is
 * the expected case, not an unlikely one.
 */
const isAlreadyStrong = (token) => /^[A-Za-z0-9_-]{43}$/.test(token ?? "");

async function main() {
  const candidates = await prisma.share.findMany({
    where: {
      publicToken: { not: null },
      location: { privacy: "SECRET" },
    },
    select: {
      id: true,
      sharedById: true,
      publicToken: true,
      location: { select: { title: true } },
    },
  });

  const alreadyStrong = candidates.filter((t) => isAlreadyStrong(t.publicToken));
  const targets = candidates.filter((t) => !isAlreadyStrong(t.publicToken));

  if (alreadyStrong.length) {
    console.log(`Skipping ${alreadyStrong.length} share(s) already on a strong token.`);
  }

  if (!targets.length) {
    console.log("No SECRET-backed shares to rotate.");
    return;
  }

  console.log(
    `${dryRun ? "[dry run] would rotate" : "Rotating"} ${targets.length} SECRET-backed share token(s):`
  );
  for (const t of targets) {
    console.log(`  ${t.id}  ${t.location?.title ?? "(untitled)"}`);
  }
  if (dryRun) return;

  for (const t of targets) {
    await prisma.share.update({
      where: { id: t.id },
      data: { publicToken: newShareToken() },
    });
    await prisma.notification
      .create({
        data: {
          userId: t.sharedById,
          type: "share",
          title: "קישור שיתוף חודש",
          body: `הקישור למקום "${t.location?.title ?? "מקום סודי"}" הוחלף מטעמי אבטחה. שלחו את הקישור החדש מחדש.`,
          href: "/settings",
        },
      })
      .catch(() => undefined);
  }

  console.log(`Rotated ${targets.length} token(s) and notified their owners.`);
}

main()
  .catch((e) => {
    console.error("rotate-secret-tokens failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
