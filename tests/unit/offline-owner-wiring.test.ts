import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * The shared-device guard was written, unit-tested and shipped **without being
 * connected to anything**. `flushSyncQueue` took an optional `userId`, its one
 * caller passed nothing, and `purgeOfflineData` had no callers at all — so the
 * leak those functions exist to close was still wide open. The pure-function
 * tests all passed, because a function can be perfectly correct and never run.
 *
 * These assertions are deliberately about *wiring*. They are structural rather
 * than behavioural because Dexie, `localStorage` and NextAuth cannot be
 * exercised under the `node` vitest environment — but "is it plugged in" is
 * exactly the question that went unasked, so it is worth asking cheaply.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("offline owner guard is actually connected", () => {
  it("flushSyncQueue requires a userId rather than accepting undefined", () => {
    const db = read("lib/offline/db.ts");
    // An optional owner is an owner check that gets forgotten.
    expect(db).not.toMatch(/flushSyncQueue\([\s\S]{0,120}?userId\?:/);
    expect(db).toMatch(/userId:\s*string/);
  });

  it("the only caller passes the userId through", () => {
    const hook = read("hooks/use-sync-queue.ts");
    expect(hook).toMatch(/flushSyncQueue\(\s*processSyncItem\s*,\s*userId\s*\)/);
  });

  it("useSyncQueue takes the owner as a required argument", () => {
    expect(read("hooks/use-sync-queue.ts")).toMatch(
      /export function useSyncQueue\(\s*userId:\s*string\s*\)/
    );
  });

  it("claims or purges on mount, not only when a flush happens", () => {
    // Signing in offline never flushes, and that is precisely the shared-device
    // case: the previous account's cached atlas would render to the next user.
    expect(read("hooks/use-sync-queue.ts")).toMatch(/assertOfflineOwner\(userId\)/);
  });

  it("the shell passes a real session id down to the banner", () => {
    expect(read("app/[locale]/(shell)/layout.tsx")).toMatch(
      /<ShellExtras[^>]*userId=\{session\.user\.id/
    );
    expect(read("components/shared/ShellExtras.tsx")).toMatch(
      /<OfflineBanner\s+userId=\{userId\}/
    );
    expect(read("components/shared/OfflineBanner.tsx")).toMatch(/useSyncQueue\(userId\)/);
  });

  it("every sign-out path purges the store first", () => {
    // NextAuth's server-side signOut event cannot reach IndexedDB, so a bare
    // signOut() leaves one account's spots on a shared device.
    for (const file of [
      "components/shared/Sidebar.tsx",
      "components/settings/SettingsClientPage.tsx",
    ]) {
      const src = read(file);
      expect(src, `${file} should use signOutAndPurge`).toMatch(/signOutAndPurge/);
      expect(src, `${file} should not import signOut directly`).not.toMatch(
        /import\s*\{\s*signOut\s*\}\s*from\s*"next-auth\/react"/
      );
    }
  });

  it("purgeOfflineData has a caller", () => {
    expect(read("lib/offline/signout.ts")).toMatch(/purgeOfflineData\(\)/);
  });
});
