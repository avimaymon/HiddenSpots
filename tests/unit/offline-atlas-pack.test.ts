import { describe, expect, it } from "vitest";
import { selectOfflineAtlasPack } from "@/lib/offline/atlas-pack";

describe("selectOfflineAtlasPack", () => {
  it("prefers favorites then visited", () => {
    const pack = selectOfflineAtlasPack(
      [
        { id: "r1", isFavorite: false, isVisited: false },
        { id: "v1", isFavorite: false, isVisited: true },
        { id: "f1", isFavorite: true, isVisited: false },
        { id: "r2", isFavorite: false, isVisited: false },
      ],
      3
    );
    expect(pack.map((p) => p.id)).toEqual(["f1", "v1", "r1"]);
  });

  it("dedupes by id", () => {
    const pack = selectOfflineAtlasPack(
      [
        { id: "a", isFavorite: true, isVisited: false },
        { id: "a", isFavorite: true, isVisited: true },
      ],
      10
    );
    expect(pack).toHaveLength(1);
  });
});
