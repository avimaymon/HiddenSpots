/**
 * Boots a throwaway Postgres for a local end-to-end run and keeps it alive
 * until interrupted, printing the connection string it created.
 *
 * Deliberately does NOT write .env.local — that file usually points at a real
 * database (`vercel env pull`), and an e2e run must never touch it. Export the
 * printed URL into the server you start instead:
 *
 *   node scripts/e2e-db.mjs                  # terminal 1, leave running
 *   DATABASE_URL=... DIRECT_URL=... AUTH_SECRET=... npm run start   # terminal 2
 *   npx playwright test                      # terminal 3
 *
 * Explicit process env beats .env.local in Next, so the server will use this
 * database rather than whatever .env.local names.
 */
import EmbeddedPostgres from "embedded-postgres";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.E2E_PG_PORT ?? 5435);
const DB = "hiddenspots_e2e";
const URL = `postgresql://postgres:e2e@127.0.0.1:${PORT}/${DB}?schema=public`;
const DIR = join(process.cwd(), ".data", "pg-e2e");

if (existsSync(DIR)) rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: DIR,
  user: "postgres",
  password: "e2e",
  port: PORT,
  persistent: false,
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
});

await pg.initialise();
await pg.start();
await pg.createDatabase(DB);

const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: URL, DIRECT_URL: URL },
});
if (migrate.status !== 0) {
  await pg.stop();
  process.exit(1);
}

console.log(`\nDATABASE_URL=${URL}`);
console.log("e2e database ready — press Ctrl+C to stop and discard it\n");

const stop = async () => {
  await pg.stop().catch(() => undefined);
  rmSync(DIR, { recursive: true, force: true });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => undefined, 1 << 30);
