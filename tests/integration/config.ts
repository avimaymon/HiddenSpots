/** Shared connection details so global-setup and the specs cannot drift apart. */
export const INTEGRATION_PG_PORT = Number(process.env.INTEGRATION_PG_PORT ?? 5434);
export const INTEGRATION_PG_USER = "postgres";
export const INTEGRATION_PG_PASSWORD = "integration";
export const INTEGRATION_PG_DATABASE = "hiddenspots_test";

export const INTEGRATION_DATABASE_URL =
  `postgresql://${INTEGRATION_PG_USER}:${INTEGRATION_PG_PASSWORD}` +
  `@127.0.0.1:${INTEGRATION_PG_PORT}/${INTEGRATION_PG_DATABASE}?schema=public`;
