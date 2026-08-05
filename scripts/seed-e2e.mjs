/**
 * Seed the fixtures the authenticated / share e2e specs need, and print the
 * env vars that unlock them.
 *
 * Without this, add-spot, secret-fuzz and share-privacy all call `test.skip`
 * and report green while asserting nothing. Two of them cover the SECRET
 * coordinate fuzzing and the private-notes boundary — the headline privacy
 * work — so their skipping meant that fix had no end-to-end verification at
 * all, only unit coverage of the pure functions.
 *
 * Idempotent: re-running updates the same rows rather than piling up fixtures,
 * so it is safe in a re-run CI job or against a local dev database.
 *
 * Usage:
 *   node scripts/seed-e2e.mjs            # prints KEY=value lines
 *   node scripts/seed-e2e.mjs --github   # appends them to $GITHUB_ENV
 *
 * Never point this at a real database: it writes a user whose password is
 * published in this file.
 */
import { PrismaClient } from "@prisma/client";
import { appendFileSync } from "node:fs";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = "e2e@hiddenspots.test";
const PASSWORD = "e2e-password-not-a-secret";
// secret-fuzz.spec.ts asserts these exact coordinates never appear verbatim.
const EXACT_LAT = 32.07;
const EXACT_LNG = 34.78;
const PRIVATE_NOTE = "GATE-CODE-E2E-DO-NOT-LEAK";
const SECRET_TOKEN = "e2e-secret-share-token-fixture";
const PUBLIC_TOKEN = "e2e-public-share-token-fixture";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_E2E_SEED) {
    throw new Error("Refusing to seed e2e fixtures with NODE_ENV=production");
  }

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      email: EMAIL,
      name: "E2E",
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      onboarded: true,
      locale: "he",
    },
  });

  // clientId doubles as a stable handle so re-runs update rather than duplicate.
  const secretSpot = await prisma.location.upsert({
    where: { userId_clientId: { userId: user.id, clientId: "e2e-secret-spot" } },
    update: { latitude: EXACT_LAT, longitude: EXACT_LNG, privateNotes: PRIVATE_NOTE },
    create: {
      userId: user.id,
      clientId: "e2e-secret-spot",
      title: "מעיין נסתר",
      latitude: EXACT_LAT,
      longitude: EXACT_LNG,
      privacy: "SECRET",
      fuzzyCoordinates: true,
      privateNotes: PRIVATE_NOTE,
    },
  });

  const publicSpot = await prisma.location.upsert({
    where: { userId_clientId: { userId: user.id, clientId: "e2e-public-spot" } },
    update: { privateNotes: PRIVATE_NOTE },
    create: {
      userId: user.id,
      clientId: "e2e-public-spot",
      title: "בריכה גלויה",
      latitude: 31.5,
      longitude: 35.1,
      privacy: "PUBLIC",
      privateNotes: PRIVATE_NOTE,
    },
  });

  for (const [token, locationId] of [
    [SECRET_TOKEN, secretSpot.id],
    [PUBLIC_TOKEN, publicSpot.id],
  ]) {
    await prisma.share.upsert({
      where: { publicToken: token },
      update: { locationId, sharedById: user.id },
      create: {
        publicToken: token,
        locationId,
        sharedById: user.id,
        permission: "VIEW",
      },
    });
  }

  const vars = {
    TEST_EMAIL: EMAIL,
    TEST_PASSWORD: PASSWORD,
    TEST_SECRET_SHARE_TOKEN: SECRET_TOKEN,
    TEST_PUBLIC_SHARE_TOKEN: PUBLIC_TOKEN,
    TEST_PRIVATE_NOTE_SNIPPET: PRIVATE_NOTE,
  };

  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);

  if (process.argv.includes("--github") && process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `${lines.join("\n")}\n`);
    console.log(`Seeded e2e fixtures; exported ${lines.length} vars to GITHUB_ENV.`);
  } else {
    console.log(lines.join("\n"));
  }
}

main()
  .catch((e) => {
    console.error("seed-e2e failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
