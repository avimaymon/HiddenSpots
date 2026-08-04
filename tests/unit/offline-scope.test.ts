import { describe, it, expect } from "vitest";
import {
  isOfflineLocalStorageKey,
  OFFLINE_LOCAL_STORAGE_PREFIXES,
  shouldClaimForUser,
  shouldPurgeForUser,
  scopedLocalStorageKey,
} from "@/lib/offline/scope";

describe("offline scope", () => {
  describe("shouldPurgeForUser", () => {
    it("returns false when current is empty", () => {
      expect(shouldPurgeForUser("user-1", "")).toBe(false);
      expect(shouldPurgeForUser("user-1", null as unknown as string)).toBe(false);
    });

    it("returns false when no owner is set (fresh install)", () => {
      expect(shouldPurgeForUser(null, "user-1")).toBe(false);
      expect(shouldPurgeForUser(undefined, "user-1")).toBe(false);
    });

    it("returns false when the store belongs to the current user", () => {
      expect(shouldPurgeForUser("user-1", "user-1")).toBe(false);
    });

    it("returns true when the store belongs to a different user", () => {
      expect(shouldPurgeForUser("user-1", "user-2")).toBe(true);
      expect(shouldPurgeForUser("alice@example.com", "bob@example.com")).toBe(true);
    });
  });

  describe("shouldClaimForUser", () => {
    it("returns false when current is empty", () => {
      expect(shouldClaimForUser(null, "")).toBe(false);
      expect(shouldClaimForUser(null, null as unknown as string)).toBe(false);
    });

    it("returns false when an owner already exists", () => {
      expect(shouldClaimForUser("user-1", "user-1")).toBe(false);
      expect(shouldClaimForUser("user-1", "user-2")).toBe(false);
    });

    it("returns true when unset and current user is present", () => {
      expect(shouldClaimForUser(null, "user-1")).toBe(true);
      expect(shouldClaimForUser(undefined, "user-2")).toBe(true);
    });
  });

  describe("scopedLocalStorageKey", () => {
    it("namespaces a key under the given user", () => {
      expect(scopedLocalStorageKey("hs_collections_v1", "user-123")).toBe(
        "hs_collections_v1::user-123"
      );
    });

    it("returns the base key when userId is empty", () => {
      expect(scopedLocalStorageKey("hs_trips_v1", "")).toBe("hs_trips_v1");
      expect(scopedLocalStorageKey("hs_trips_v1", null as unknown as string)).toBe(
        "hs_trips_v1"
      );
    });
  });

  describe("isOfflineLocalStorageKey", () => {
    it("recognizes keys the offline store owns", () => {
      expect(isOfflineLocalStorageKey("hs_collections_v1")).toBe(true);
      expect(isOfflineLocalStorageKey("hs_collections_v1::user-123")).toBe(true);
      expect(isOfflineLocalStorageKey("hs_trips_v1")).toBe(true);
      expect(isOfflineLocalStorageKey("hs_trips_v1::user-456")).toBe(true);
      expect(isOfflineLocalStorageKey("hs_loc_cols_loc-1")).toBe(true);
      expect(isOfflineLocalStorageKey("hs_loc_cols_loc-1::user-789")).toBe(true);
    });

    it("rejects keys the offline store does not own", () => {
      expect(isOfflineLocalStorageKey("other_key")).toBe(false);
      expect(isOfflineLocalStorageKey("hs_unrelated")).toBe(false);
      expect(isOfflineLocalStorageKey("hs_")).toBe(false);
      expect(isOfflineLocalStorageKey("")).toBe(false);
    });
  });

  describe("OFFLINE_LOCAL_STORAGE_PREFIXES", () => {
    it("is a readonly list of all prefixes", () => {
      expect(OFFLINE_LOCAL_STORAGE_PREFIXES).toContain("hs_collections_v1");
      expect(OFFLINE_LOCAL_STORAGE_PREFIXES).toContain("hs_trips_v1");
      expect(OFFLINE_LOCAL_STORAGE_PREFIXES).toContain("hs_loc_cols_");
      expect(OFFLINE_LOCAL_STORAGE_PREFIXES).toHaveLength(3);
    });
  });
});
