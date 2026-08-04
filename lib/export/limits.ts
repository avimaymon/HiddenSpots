/** Hard ceilings so serverless export handlers cannot OOM on huge atlases. */
export const EXPORT_LOCATIONS_MAX = 5_000;
export const EXPORT_VISITS_MAX = 10_000;
export const EXPORT_COLLECTIONS_MAX = 2_000;
export const EXPORT_TRIPS_MAX = 2_000;
export const EXPORT_SHARES_MAX = 2_000;
export const EXPORT_TRACKS_MAX = 500;

/** Cap near-dupe scans during import / Drive restore (false-negatives beyond cap). */
export const DUPE_SCAN_MAX = 5_000;

/**
 * Blob keys collected per photo table before an account delete. Beyond this the
 * remainder is reported as orphaned rather than silently dropped — the account
 * still deletes, which is the part the user is entitled to.
 */
export const DELETE_ACCOUNT_BLOBS_MAX = 5_000;
