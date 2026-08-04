import EmbeddedPostgres from "embedded-postgres";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  INTEGRATION_DATABASE_URL,
  INTEGRATION_PG_DATABASE,
  INTEGRATION_PG_PASSWORD,
  INTEGRATION_PG_PORT,
  INTEGRATION_PG_USER,
} from "./config";

/**
 * Boots a throwaway Postgres for the integration suite and applies the real
 * migration history to it.
 *
 * Applying migrations (rather than `db push`) is the point: these tests exist
 * to prove the FK cascades in prisma/migrations actually let a user row be
 * deleted. `db push` would build the schema from schema.prisma directly and
 * never exercise the SQL production runs.
 */
const DATA_DIR = join(process.cwd(), ".data", "pg-test");

let pg: EmbeddedPostgres | undefined;

export async function setup() {
  // Always start from a clean cluster so a half-applied migration from a
  // previous run cannot mask a broken one.
  if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true, force: true });
  mkdirSync(DATA_DIR, { recursive: true });

  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: INTEGRATION_PG_USER,
    password: INTEGRATION_PG_PASSWORD,
    port: INTEGRATION_PG_PORT,
    persistent: false,
    initdbFlags: ["--locale=C", "--encoding=UTF8"],
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(INTEGRATION_PG_DATABASE);

  const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: INTEGRATION_DATABASE_URL,
      DIRECT_URL: INTEGRATION_DATABASE_URL,
    },
  });
  if (migrate.status !== 0) {
    throw new Error("prisma migrate deploy failed against the integration database");
  }
}

export async function teardown() {
  await pg?.stop().catch(() => undefined);
  rmSync(DATA_DIR, { recursive: true, force: true });
}
