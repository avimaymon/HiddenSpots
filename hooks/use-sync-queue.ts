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
  remapClientLocationId,
  remapClientTempId,
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
      const rest = { ...payload };
      delete rest.clientId;
      const loc = await createLocation(rest);
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
      if (blobId) {
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
        await addLocationPhoto(locationId, url, row.isPrimary);
        await deletePhotoBlob(blobId);
      } else if (typeof payload.url === "string" && !payload.url.startsWith("blob:")) {
        await addLocationPhoto(
          await resolveLocationId(payload.locationId as string),
          payload.url,
          Boolean(payload.isPrimary)
        );
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
      const rest = { ...payload };
      delete rest.clientId;
      if (typeof rest.parentId === "string") {
        rest.parentId = await resolveMappedId(rest.parentId);
      }
      const col = await createCollection(rest);
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

export function useSyncQueue() {
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
      const result = await flushSyncQueue(processSyncItem);
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
  }, [syncing, refreshCounts]);

  const dropStuck = useCallback(async () => {
    const n = await dropStuckSyncItems();
    await refreshCounts();
    return n;
  }, [refreshCounts]);

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
