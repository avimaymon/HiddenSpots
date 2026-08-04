/** Hard ceilings so serverless export handlers cannot OOM on huge atlases. */
export const EXPORT_LOCATIONS_MAX = 5_000;
export const EXPORT_VISITS_MAX = 10_000;
export const EXPORT_COLLECTIONS_MAX = 2_000;
export const EXPORT_TRIPS_MAX = 2_000;
export const EXPORT_SHARES_MAX = 2_000;
export const EXPORT_TRACKS_MAX = 500;

/** Cap near-dupe scans during import / Drive restore (false-negatives beyond cap). */
export const DUPE_SCAN_MAX = 5_000;
