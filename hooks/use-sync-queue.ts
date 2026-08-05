"use client";

import { useEffect, useCallback, useState } from "react";
import {
  flushSyncQueue,
  pendingSyncCount,
  failedSyncCount,
  getSyncQueueSummary,
  dropStuckSyncItems,
  takePhotoBlob,
  deletePhotoBlob,
  persistSyncPayload,
  remapClientLocationId,
  remapClientTempId,
  assertOfflineOwner,
  resolveLocationId,
  resolveMappedId,
  type SyncQueueItem,
} from "@/lib/offline/db";
import { track } from "@/lib/analytics";
import {
  setFavorite,
  createLocation,
  updateLocation,
  deleteLocation,
  addLocationPhoto,
} from "@/lib/actions/locations";
import { createVisit } from "@/lib/actions/visits";
import { saveTrack } from "@/lib/actions/tracks";
import {
  addLocationToCollection,
  removeLocationFromCollection,
  createCollection,
  deleteCollection,
} from "@/lib/actions/collections";
import {
  addLocationToTrip,
  removeLocationFromTrip,
  reorderTripLocations,
  createTrip,
  deleteTrip,
} from "@/lib/actions/trips";

/**
 * Last-write-wins: queue order is FIFO by createdAt.
 * Ceiling: no vector clocks — upgrade to updatedAt comparison if multi-device conflicts appear.
 */
export async function processSyncItem(item: SyncQueueItem) {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;
  switch (item.action) {
    case "favorite":
      await setFavorite(await resolveLocationId(payload.locationId as string), true);
      break;
    case "unfavorite":
      await setFavorite(await resolveLocationId(payload.locationId as string), false);
      break;
    case "visit": {
      const locationId = await resolveLocationId(payload.locationId as string);
      await createVisit({ ...payload, locationId });
      break;
    }
    case "delete":
      await deleteLocation(await resolveLocationId(payload.locationId as string));
      break;
    case "create": {
      const clientId =
        typeof payload.clientId === "string" ? payload.clientId : undefined;
      const loc = await createLocation(payload);
      if (clientId && loc?.id) {
        await remapClientLocationId(clientId, loc.id);
      }
      break;
    }
    case "update": {
      const { locationId, ...data } = payload as { locationId: string } & Record<
        string,
        unknown
      >;
      await updateLocation(await resolveLocationId(locationId), data);
      break;
    }
    case "upload-photo": {
      const blobId = payload.blobId as string | undefined;
      const uploaded =
        typeof payload.url === "string" && !payload.url.startsWith("blob:")
          ? payload.url
          : undefined;

      if (blobId && !uploaded) {
        const row = await takePhotoBlob(blobId);
        if (!row) throw new Error("Photo blob missing");
        const locationId = await resolveLocationId(row.locationId);
        const file = new File([row.data], `offline-${blobId}.jpg`, { type: row.mimeType });
        const fd = new FormData();
        fd.append("file", file);
        fd.append("locationId", locationId);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = (await res.json()) as { url: string };

        // The blob is now in storage and cannot be un-uploaded. Record that on
        // the queue row *before* the write that may still fail, so a retry
        // reuses this URL instead of uploading a second copy and orphaning the
        // first. Persisting is what makes this real — mutating the in-memory
        // payload would be dropped when the retry re-reads the row.
        payload.url = url;
        payload.locationId = locationId;
        payload.isPrimary = row.isPrimary;
        await persistSyncPayload(item.id, payload);

        // blobId doubles as the photo's idempotency key server-side.
        await addLocationPhoto(locationId, url, row.isPrimary, blobId);
        await deletePhotoBlob(blobId);
      } else if (uploaded) {
        await addLocationPhoto(
          await resolveLocationId(payload.locationId as string),
          uploaded,
          Boolean(payload.isPrimary),
          blobId
        );
        if (blobId) await deletePhotoBlob(blobId);
      } else {
        throw new Error("Invalid offline photo payload");
      }
      break;
    }
    case "save-track": {
      const trackPayload = { ...payload };
      if (typeof trackPayload.locationId === "string" && trackPayload.locationId) {
        trackPayload.locationId = await resolveMappedId(trackPayload.locationId);
      }
      await saveTrack(trackPayload);
      break;
    }
    case "collection-add":
      await addLocationToCollection(
        await resolveMappedId(payload.collectionId as string),
        await resolveLocationId(payload.locationId as string)
      );
      break;
    case "collection-remove":
      await removeLocationFromCollection(
        await resolveMappedId(payload.collectionId as string),
        await resolveLocationId(payload.locationId as string)
      );
      break;
    case "collection-create": {
      const clientId =
        typeof payload.clientId === "string" ? payload.clientId : undefined;
      if (typeof payload.parentId === "string") {
        payload.parentId = await resolveMappedId(payload.parentId);
      }
      const col = await createCollection(payload);
      if (clientId && col?.id) {
        await remapClientTempId(clientId, col.id);
      }
      break;
    }
    case "trip-add":
      await addLocationToTrip(
        await resolveMappedId(payload.tripId as string),
        await resolveLocationId(payload.locationId as string)
      );
      break;
    case "trip-remove":
      await removeLocationFromTrip(
        await resolveMappedId(payload.tripId as string),
        await resolveLocationId(payload.locationId as string)
      );
      break;
    case "trip-reorder": {
      const orderedIds = Array.isArray(payload.orderedIds)
        ? (payload.orderedIds as string[])
        : [];
      await reorderTripLocations(
        await resolveMappedId(payload.tripId as string),
        await Promise.all(orderedIds.map((id) => resolveLocationId(id)))
      );
      break;
    }
    case "trip-create": {
      const clientId =
        typeof payload.clientId === "string" ? payload.clientId : undefined;
      const rest = { ...payload };
      delete rest.clientId;
      const trip = await createTrip(rest);
      if (clientId && trip?.id) {
        await remapClientTempId(clientId, trip.id);
      }
      break;
    }
    case "trip-delete":
      await deleteTrip(await resolveMappedId(payload.tripId as string));
      break;
    case "collection-delete":
      await deleteCollection(await resolveMappedId(payload.collectionId as string));
      break;
    default:
      throw new Error(`Unknown sync action: ${item.action}`);
  }
}

/**
 * @param userId Account that owns this browser's offline store. Required, not
 * optional: the store is per-origin, so without it `flushSyncQueue` cannot
 * tell whose queued writes it is draining and one account's spots land in the
 * next account to sign in on the same device. Making it a required argument is
 * what stops that guard from being silently skipped.
 */
export function useSyncQueue(userId: string) {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refreshCounts = useCallback(async () => {
    const summary = await getSyncQueueSummary();
    setPending(summary.pending);
    setFailed(summary.failed);
    setLastError(summary.lastError);
  }, []);

  const flush = useCallback(async () => {
    if (syncing) return { synced: 0, failed: 0 };
    setSyncing(true);
    try {
      const result = await flushSyncQueue(processSyncItem, userId);
      if (result.failed > 0) {
        track("sync_failed", { failed: result.failed, synced: result.synced });
      } else if (result.synced > 0) {
        track("sync_success", { synced: result.synced });
      }
      await refreshCounts();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshCounts, userId]);

  const dropStuck = useCallback(async () => {
    const n = await dropStuckSyncItems();
    await refreshCounts();
    return n;
  }, [refreshCounts]);

  // Claim the store for this account, or purge it if it belongs to someone
  // else — on mount, and independently of flushing. Doing it only inside
  // flush would miss the case that matters most: signing in *offline* on a
  // shared device never flushes, so the previous account's cached atlas would
  // render to whoever signed in next.
  useEffect(() => {
    let cancelled = false;
    void assertOfflineOwner(userId).then((ok) => {
      if (!ok && !cancelled) void refreshCounts();
    });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshCounts]);

  useEffect(() => {
    const onOnline = () => {
      void flush();
    };
    window.addEventListener("online", onOnline);
    const boot = window.setTimeout(() => {
      void refreshCounts();
      if (navigator.onLine) void flush();
    }, 0);
    const id = window.setInterval(() => {
      void pendingSyncCount().then(setPending);
      void failedSyncCount().then(setFailed);
    }, 15_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [flush, refreshCounts]);

  return { pending, failed, lastError, syncing, flush, dropStuck, refreshCounts };
}
