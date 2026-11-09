import type { Candidate } from "./types";
import { GenerationError, shuffled } from "./generation";
export function coverageAllocations(
  pool: Candidate[],
  chapterGroups: Record<string, string>,
  groupCounts: Record<string, number>,
  seed: string,
  weights: Record<string, number> | undefined,
  label: string,
) {
  const result: Record<string, number> = {};
  for (const [group, total] of Object.entries(groupCounts)) {
    if (!Number.isInteger(total) || total < 0)
      throw new GenerationError("Invalid section coverage quota");
    const chapters = shuffled(
      [
        ...new Set(
          pool
            .filter((q) => chapterGroups[q.chapterId] === group)
            .map((q) => q.chapterId),
        ),
      ],
      seed + group,
    );
    const capacity = Object.fromEntries(
      chapters.map((id) => [id, pool.filter((q) => q.chapterId === id).length]),
    );
    const available = Object.values(capacity).reduce((a, b) => a + b, 0);
    if (available < total)
      throw new GenerationError(
        `${label} ${group}: need ${total} eligible questions; available ${available}`,
      );
    for (let i = 0; i < total; i++) {
      const next = chapters
        .filter(
          (id) =>
            (result[id] ?? 0) < capacity[id] &&
            (weights?.[id] ?? capacity[id]) > 0,
        )
        .sort(
          (a, b) =>
            (result[a] ?? 0) / (weights?.[a] ?? capacity[a]) -
            (result[b] ?? 0) / (weights?.[b] ?? capacity[b]),
        )[0];
      if (!next)
        throw new GenerationError(
          `${label} chapter distribution cannot be satisfied`,
        );
      result[next] = (result[next] ?? 0) + 1;
    }
  }
  return result;
}
