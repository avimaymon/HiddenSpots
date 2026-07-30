"use client";

import { useEffect, useCallback, useState } from "react";
import { flushSyncQueue, pendingSyncCount, type SyncQueueItem } from "@/lib/offline/db";
import {
  toggleFavorite,
  createLocation,
  updateLocation,
  deleteLocation,
  addLocationPhoto,
} from "@/lib/actions/locations";
import { createVisit } from "@/lib/actions/visits";

/**
 * Last-write-wins: queue order is FIFO by createdAt.
 * Server accepts each mutation as authoritative at apply time.
 * Ceiling: no vector clocks — upgrade to updatedAt comparison if multi-device conflicts appear.
 */
export async function processSyncItem(item: SyncQueueItem) {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;
  switch (item.action) {
    case "favorite":
    case "unfavorite":
      await toggleFavorite(payload.locationId as string);
      break;
    case "visit":
      await createVisit(payload);
      break;
    case "delete":
      await deleteLocation(payload.locationId as string);
      break;
    case "create":
      await createLocation(payload);
      break;
    case "update": {
      const { locationId, ...data } = payload as { locationId: string } & Record<string, unknown>;
      await updateLocation(locationId, data);
      break;
    }
    case "upload-photo":
      await addLocationPhoto(
        payload.locationId as string,
        payload.url as string,
        Boolean(payload.isPrimary)
      );
      break;
    default:
      throw new Error(`Unknown sync action: ${item.action}`);
  }
}

export function useSyncQueue() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const flush = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await flushSyncQueue(processSyncItem);
      const count = await pendingSyncCount();
      setPending(count);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    pendingSyncCount().then(setPending);

    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (navigator.onLine) flush();
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  return { pending, syncing, flush };
}
