import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Production requires more than development does. Validating both against the
 * same lenient schema is why a deploy missing AUTH_SECRET used to boot happily
 * and only fail later, at the first request that needed it.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  // Required in production: NextAuth cannot sign sessions without it, and it
  // keys the share coordinate fuzzing (lib/shares/fuzz-seed.ts).
  AUTH_SECRET: isProduction ? z.string().min(32) : z.string().min(32).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Not fatal, but worth surfacing at boot: each of these silently disables a
 * feature rather than breaking one, so its absence is otherwise invisible.
 */
const PRODUCTION_ADVISORY: Array<[string, string]> = [
  ["CRON_SECRET", "scheduled Drive backups will refuse to run"],
  ["BLOB_READ_WRITE_TOKEN", "photo upload will fail at runtime"],
  [
    "UPSTASH_REDIS_REST_URL",
    "rate limits fall back to a per-instance map that resets on cold start",
  ],
];

const clientSchema = z.object({
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_PROVIDER: z.enum(["plausible", "noop"]).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

/**
 * Called from instrumentation.ts at boot. In production this throws: a deploy
 * that cannot possibly work should fail loudly at startup rather than serve
 * errors from whichever request happens to need the missing value first.
 */
export function validateServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    if (isProduction) {
      throw new Error(
        `Invalid server environment: ${Object.entries(fields)
          .map(([k, v]) => `${k} (${v?.join(", ")})`)
          .join("; ")}`
      );
    }
    console.warn("[env] Invalid server environment:", fields);
    return process.env as unknown as ServerEnv;
  }

  if (isProduction) {
    for (const [key, consequence] of PRODUCTION_ADVISORY) {
      if (!process.env[key]) {
        console.warn(
          JSON.stringify({ tag: "env.missing-optional", key, consequence })
        );
      }
    }
  }

  return parsed.data;
}

export function getClientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_ANALYTICS_PROVIDER: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER as
      | "plausible"
      | "noop"
      | undefined,
  });
}
