"use client";

import { signOut } from "next-auth/react";
import { purgeOfflineData } from "@/lib/offline/db";

/**
 * Sign out and clear this browser's offline store.
 *
 * NextAuth v5's `events.signOut` runs on the server and cannot touch
 * IndexedDB, so the purge has to happen here, client-side, before the redirect.
 * Every sign-out path must call this rather than `signOut` directly — leaving
 * one account's queued spots and cached atlas on a shared device is the whole
 * bug.
 *
 * The purge is best-effort: a failure there must not trap someone in a session
 * they are trying to leave. `assertOfflineOwner` still catches the leftovers on
 * the next sign-in, so this is the fast path, not the only guard.
 */
export async function signOutAndPurge(callbackUrl: string): Promise<void> {
  try {
    await purgeOfflineData();
  } catch {
    /* fall through — signing out matters more, and the owner check backstops it */
  }
  await signOut({ callbackUrl });
}
