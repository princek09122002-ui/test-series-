import type { Candidate } from "./types";
import { GenerationError, shuffled } from "./generation";
export function physicsAllocations(
  pool: Candidate[],
  classes: Record<string, number>,
  classCounts: Record<string, number>,
  seed: string,
  weights?: Record<string, number>,
) {
  const result: Record<string, number> = {};
  for (const [level, total] of Object.entries(classCounts)) {
    const chapters = shuffled(
      [
        ...new Set(
          pool
            .filter((q) => classes[q.chapterId] === Number(level))
            .map((q) => q.chapterId),
        ),
      ],
      seed + level,
    );
    const capacity = Object.fromEntries(
      chapters.map((id) => [id, pool.filter((q) => q.chapterId === id).length]),
    );
    if (Object.values(capacity).reduce((a, b) => a + b, 0) < total)
      throw new GenerationError(
        `Physics Class ${level}: need ${total} eligible questions; available ${Object.values(capacity).reduce((a, b) => a + b, 0)}`,
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
          "Physics chapter distribution cannot be satisfied",
        );
      result[next] = (result[next] ?? 0) + 1;
    }
  }
  return result;
}
