/**
 * Vercel production build: prisma generate → migrate deploy → next build.
 * Falls back DIRECT_URL → DATABASE_URL when Neon only provisioned the pooled URL.
 */
import { spawnSync } from "node:child_process";

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  console.log("[deploy-build] DIRECT_URL unset — using DATABASE_URL");
}

function run(cmd) {
  const r = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status) process.exit(r.status ?? 1);
}

run("npx prisma generate");
run("npx prisma migrate deploy");
run("npx next build");
