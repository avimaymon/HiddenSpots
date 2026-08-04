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
 * Stops copied by a single clone. The whole clone runs in one transaction, so
 * this bounds how long that transaction can hold its locks; past the cap the
 * caller is told it was truncated rather than being handed a silently partial
 * copy. Uncapped, a large shared trip meant hundreds of sequential round trips
 * to Neon and a clone that could only ever time out.
 */
export const CLONE_STOPS_MAX = 200;

/**
 * Caps for the spot detail page, which renders on every view. Without them a
 * well-used spot pulled its whole visit history and every attached photo into
 * one serverless response. `_count` still reports the true totals.
 */
export const LOCATION_DETAIL_PHOTOS_MAX = 100;
export const LOCATION_DETAIL_VISITS_MAX = 100;
export const LOCATION_DETAIL_VISIT_PHOTOS_MAX = 20;

/** Stops loaded for one trip's itinerary view. */
export const TRIP_STOPS_MAX = 500;

/**
 * Blob keys collected per photo table before an account delete. Beyond this the
 * remainder is reported as orphaned rather than silently dropped — the account
 * still deletes, which is the part the user is entitled to.
 */
export const DELETE_ACCOUNT_BLOBS_MAX = 5_000;
