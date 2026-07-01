import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function validateServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success && process.env.NODE_ENV === "production") {
    console.error("Invalid server environment:", parsed.error.flatten().fieldErrors);
  }
  return parsed.success ? parsed.data : (process.env as ServerEnv);
}

export function getClientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });
}
