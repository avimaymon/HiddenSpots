import { PrismaClient } from "@prisma/client";
import { INTEGRATION_DATABASE_URL } from "./config";

/**
 * A client bound explicitly to the integration database — not `lib/db`, whose
 * singleton reads DATABASE_URL at import time and would otherwise pick up
 * whatever the developer has in .env.local.
 */
export const db = new PrismaClient({
  datasources: { db: { url: INTEGRATION_DATABASE_URL } },
});
