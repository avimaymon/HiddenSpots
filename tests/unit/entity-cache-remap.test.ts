import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COLLECTIONS_CACHE_KEY,
  readEntityCache,
  rewriteEntityCacheIds,
  writeEntityCache,
} from "@/lib/offline/entity-cache";

describe("rewriteEntityCacheIds", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    });
  });

  it("rewrites collection id and parentId", () => {
    writeEntityCache(COLLECTIONS_CACHE_KEY, [
      { id: "tmp-a", name: "A", parentId: null },
      { id: "tmp-b", name: "B", parentId: "tmp-a" },
    ]);
    rewriteEntityCacheIds("tmp-a", "srv-a");
    expect(readEntityCache(COLLECTIONS_CACHE_KEY)).toEqual([
      { id: "srv-a", name: "A", parentId: null },
      { id: "tmp-b", name: "B", parentId: "srv-a" },
    ]);
  });
});
