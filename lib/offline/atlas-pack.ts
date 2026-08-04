/** Prefer favorites → visited → rest for airplane-mode map usefulness. */
export function selectOfflineAtlasPack<
  T extends { id: string; isFavorite: boolean; isVisited: boolean },
>(locations: T[], max: number): T[] {
  const favs = locations.filter((l) => l.isFavorite);
  const visited = locations.filter((l) => l.isVisited && !l.isFavorite);
  const rest = locations.filter((l) => !l.isFavorite && !l.isVisited);
  const out: T[] = [];
  const seen = new Set<string>();
  for (const l of [...favs, ...visited, ...rest]) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    out.push(l);
    if (out.length >= max) break;
  }
  return out;
}
