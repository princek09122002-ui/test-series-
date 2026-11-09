import type { Candidate, Difficulty } from "./types";
export class GenerationError extends Error {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}
export const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
export function eligible(question: Candidate, selected: Set<string>) {
  return (
    question.topicIds.length > 0 &&
    [...question.topicIds, ...question.prerequisiteIds].every((id) =>
      selected.has(id),
    )
  );
}
export function quotas(
  total: number,
  percentages: Record<Difficulty, number>,
): Record<Difficulty, number> {
  if (Object.values(percentages).reduce((a, b) => a + b, 0) !== 100)
    throw new GenerationError("Difficulty percentages must add to 100");
  const result = Object.fromEntries(
    DIFFICULTIES.map((d) => [d, Math.floor((total * percentages[d]) / 100)]),
  ) as Record<Difficulty, number>;
  const remainders = [...DIFFICULTIES].sort(
    (a, b) =>
      (total * percentages[b]) / 100 -
      result[b] -
      ((total * percentages[a]) / 100 - result[a]),
  );
  for (
    let remaining = total - Object.values(result).reduce((a, b) => a + b, 0),
      i = 0;
    remaining > 0;
    remaining--, i++
  )
    result[remainders[i]]++;
  return result;
}
function random(seed: string) {
  let state = 2166136261;
  for (const char of seed)
    state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled<T>(items: T[], seed: string) {
  const result = [...items],
    rng = random(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
// Integral max flow satisfies chapter/subject AND difficulty quotas without greedy dead ends.
function allocationMatrix(
  candidates: Candidate[],
  allocations: Record<string, number>,
  difficulty: Record<Difficulty, number>,
  groupBy: "chapterId" | "subjectId",
) {
  const groups = Object.keys(allocations),
    size = groups.length + 5,
    sink = size - 1;
  const capacity = Array.from({ length: size }, () =>
    Array<number>(size).fill(0),
  );
  groups.forEach((g, i) => {
    capacity[0][i + 1] = allocations[g];
    DIFFICULTIES.forEach(
      (d, j) =>
        (capacity[i + 1][groups.length + 1 + j] = candidates.filter(
          (q) => q[groupBy] === g && q.difficulty === d,
        ).length),
    );
  });
  DIFFICULTIES.forEach(
    (d, j) => (capacity[groups.length + 1 + j][sink] = difficulty[d]),
  );
  const residual = capacity.map((row) => [...row]);
  let flow = 0;
  while (true) {
    const parent = Array<number>(size).fill(-1),
      queue = [0];
    parent[0] = 0;
    for (let head = 0; head < queue.length; head++)
      for (let v = 0; v < size; v++)
        if (parent[v] === -1 && residual[queue[head]][v] > 0) {
          parent[v] = queue[head];
          queue.push(v);
        }
    if (parent[sink] === -1) break;
    let amount = Infinity;
    for (let v = sink; v !== 0; v = parent[v])
      amount = Math.min(amount, residual[parent[v]][v]);
    for (let v = sink; v !== 0; v = parent[v]) {
      residual[parent[v]][v] -= amount;
      residual[v][parent[v]] += amount;
    }
    flow += amount;
  }
  const total = Object.values(allocations).reduce((a, b) => a + b, 0);
  if (flow !== total)
    throw new GenerationError(
      "The chapter/subject allocation and difficulty mix cannot both be met. Adjust the mix, allocations, or selected topics.",
    );
  return groups.flatMap((g, i) =>
    DIFFICULTIES.map((d, j) => ({
      group: g,
      difficulty: d,
      count:
        capacity[i + 1][groups.length + 1 + j] -
        residual[i + 1][groups.length + 1 + j],
    })),
  );
}
export function selectQuestions(
  input: Candidate[],
  count: number,
  percentages: Record<Difficulty, number>,
  seed: string,
  allocations?: Record<string, number>,
  groupBy: "chapterId" | "subjectId" = "chapterId",
  difficultyMode: "STRICT" | "ANY" = "STRICT",
) {
  const pool = [...new Map(input.map((q) => [q.id, q])).values()];
  if (difficultyMode === "ANY") {
    if (pool.length < count)
      throw new GenerationError(
        `Insufficient eligible questions. Requested ${count}; available ${pool.length}. Reduce the count, include attempted questions, or expand topics.`,
        { available: pool.length, required: count },
      );
    if (allocations) {
      if (
        Object.values(allocations).some((n) => !Number.isInteger(n) || n < 0) ||
        Object.values(allocations).reduce((a, b) => a + b, 0) !== count
      ) throw new GenerationError("Allocations must be non-negative integers adding to the requested count");
      const selected = Object.entries(allocations).flatMap(([group, required]) => {
        const candidates = shuffled(pool.filter((q) => q[groupBy] === group), seed + group);
        if (candidates.length < required)
          throw new GenerationError(`Insufficient eligible questions for ${group}: need ${required}, available ${candidates.length}`);
        return candidates.slice(0, required);
      });
      return shuffled(selected, seed + ":order");
    }
    const groups = shuffled([...new Set(pool.map((q) => q.chapterId))], seed + ":chapters");
    const buckets = groups.map((group) => shuffled(pool.filter((q) => q.chapterId === group), seed + group));
    const selected: Candidate[] = [];
    while (selected.length < count)
      for (const bucket of buckets) {
        if (selected.length >= count) break;
        const question = bucket.pop();
        if (question) selected.push(question);
      }
    return shuffled(selected, seed + ":order");
  }
  const required = quotas(count, percentages);
  const available = Object.fromEntries(
    DIFFICULTIES.map((d) => [d, pool.filter((q) => q.difficulty === d).length]),
  );
  if (
    pool.length < count ||
    DIFFICULTIES.some((d) => available[d] < required[d])
  )
    throw new GenerationError(
      `Insufficient eligible questions for the requested mix. Requested ${count}; available ${pool.length}. Reduce the count, include attempted questions, expand topics, or adjust difficulty.`,
      { available, required },
    );
  const selected: Candidate[] = [];
  if (allocations) {
    if (
      Object.values(allocations).some((n) => !Number.isInteger(n) || n < 0) ||
      Object.values(allocations).reduce((a, b) => a + b, 0) !== count
    )
      throw new GenerationError(
        "Allocations must be non-negative integers adding to the requested count",
      );
    for (const cell of allocationMatrix(pool, allocations, required, groupBy))
      selected.push(
        ...shuffled(
          pool.filter(
            (q) =>
              q[groupBy] === cell.group && q.difficulty === cell.difficulty,
          ),
          seed + cell.group + cell.difficulty,
        ).slice(0, cell.count),
      );
  } else {
    // Round-robin within each difficulty: broad chapter coverage, capped by actual supply.
    for (const d of DIFFICULTIES) {
      const groups = shuffled(
        [
          ...new Set(
            pool.filter((q) => q.difficulty === d).map((q) => q.chapterId),
          ),
        ],
        seed + d,
      );
      const buckets = groups.map((g) =>
        shuffled(
          pool.filter((q) => q.chapterId === g && q.difficulty === d),
          seed + g + d,
        ),
      );
      let taken = 0;
      while (taken < required[d])
        for (const bucket of buckets) {
          if (taken >= required[d]) break;
          const q = bucket.pop();
          if (q) {
            selected.push(q);
            taken++;
          }
        }
    }
  }
  if (
    selected.length !== count ||
    new Set(selected.map((q) => q.id)).size !== count
  )
    throw new GenerationError("Question selection failed integrity validation");
  return shuffled(selected, seed + ":order");
}
