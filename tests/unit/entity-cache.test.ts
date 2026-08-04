import { describe, it, expect, beforeEach } from "vitest";
import {
  readEntityCache,
  writeEntityCache,
  COLLECTIONS_CACHE_KEY,
} from "@/lib/offline/entity-cache";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      clear: () => store.clear(),
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
  });
});

describe("entity-cache", () => {
  it("round-trips JSON values", () => {
    writeEntityCache(COLLECTIONS_CACHE_KEY, [{ id: "a", name: "מפלים" }]);
    expect(readEntityCache<{ id: string; name: string }[]>(COLLECTIONS_CACHE_KEY)).toEqual([
      { id: "a", name: "מפלים" },
    ]);
  });

  it("returns null for missing keys", () => {
    expect(readEntityCache("missing")).toBeNull();
  });
});
