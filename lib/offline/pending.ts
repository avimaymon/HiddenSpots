/**
 * Offline creates use crypto.randomUUID(); Prisma uses cuid().
 * Treat UUID-shaped ids as unsynced so UI never navigates to server 404s.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPendingOfflineId(id: string): boolean {
  return UUID_RE.test(id);
}
