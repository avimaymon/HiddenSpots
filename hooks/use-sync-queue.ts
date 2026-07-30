"use client";

import { useEffect, useCallback, useState } from "react";
import {
  flushSyncQueue,
  pendingSyncCount,
  failedSyncCount,
  getSyncQueueSummary,
  dropStuckSyncItems,
  type SyncQueueItem,
} from "@/lib/offline/db";
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
    // Defer: Dexie counts are external store; avoid sync setState-in-effect
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
