import {candidateChapters,suggestPhysicsMapping} from "../../src/lib/domain/physics-classification";
import { describe, it, expect } from "vitest";
import { physicsAllocations } from "../../src/lib/domain/physics";
import { selectQuestions, eligible } from "../../src/lib/domain/generation";
import type { Candidate } from "../../src/lib/domain/types";
const pool: Candidate[] = Array.from({ length: 120 }, (_, i) => ({
  id: String(i),
  chapterId: i < 60 ? "a" : "b",
  subjectId: "physics",
  difficulty: "MEDIUM",
  topicIds: ["chosen"],
  prerequisiteIds: [],
}));
const mix = { EASY: 0, MEDIUM: 100, HARD: 0 };
describe("Physics section policy", () => {
  it("allocates exactly 22/23 across classes", () =>
    expect(
      physicsAllocations(pool, { a: 11, b: 12 }, { 11: 22, 12: 23 }, "seed"),
    ).toEqual({ a: 22, b: 23 }));
  it("selects 45 unique questions", () => {
    const a = physicsAllocations(
      pool,
      { a: 11, b: 12 },
      { 11: 22, 12: 23 },
      "s",
    );
    expect(
      new Set(selectQuestions(pool, 45, mix, "s", a).map((q) => q.id)).size,
    ).toBe(45);
  });
  it("reproduces the same seeded test", () =>
    expect(selectQuestions(pool, 45, mix, "x")).toEqual(
      selectQuestions(pool, 45, mix, "x"),
    ));
  it("changes tests with another seed", () =>
    expect(selectQuestions(pool, 45, mix, "x")).not.toEqual(
      selectQuestions(pool, 45, mix, "y"),
    ));
  it("rejects empty private-only bank", () =>
    expect(() => physicsAllocations([], {}, { 11: 22, 12: 23 }, "x")).toThrow(
      "eligible",
    ));
  it("does not fill a missing class with another class", () =>
    expect(() =>
      physicsAllocations(
        pool.filter((q) => q.chapterId === "a"),
        { a: 11 },
        { 11: 22, 12: 23 },
        "x",
      ),
    ).toThrow());
  it("rejects impossible chapter policies", () =>
    expect(() =>
      physicsAllocations(pool, { a: 11, b: 12 }, { 11: 22, 12: 23 }, "x", {
        a: 0,
        b: 1,
      }),
    ).toThrow());
  it("does not weaken difficulty constraints", () =>
    expect(() =>
      selectQuestions(pool, 45, { EASY: 100, MEDIUM: 0, HARD: 0 }, "x"),
    ).toThrow());
  it("requires every prerequisite", () =>
    expect(
      eligible(
        { ...pool[0], prerequisiteIds: ["unseen"] },
        new Set(["chosen"]),
      ),
    ).toBe(false));
  it("requires every secondary topic", () =>
    expect(
      eligible(
        { ...pool[0], topicIds: ["chosen", "other"] },
        new Set(["chosen"]),
      ),
    ).toBe(false));
  it("supports reviewed multi-topic selections", () =>
    expect(
      eligible(
        { ...pool[0], topicIds: ["chosen", "other"] },
        new Set(["chosen", "other"]),
      ),
    ).toBe(true));
  it("deduplicates candidate identities", () =>
    expect(
      new Set(
        selectQuestions([...pool, ...pool], 45, mix, "x").map((q) => q.id),
      ).size,
    ).toBe(45));
});

it("keeps overlapping source groups as multiple chapter candidates",()=>{expect(candidateChapters("Atoms and Nuclei")).toHaveLength(2);expect(candidateChapters("Heat and Thermodynamics")).toHaveLength(3);expect(candidateChapters("Vector Algebra")).toEqual(["physics-school-11-3"]);});
it("does not approve a topic from a filename alone",()=>expect(suggestPhysicsMapping("Atoms and Nuclei","",[{id:"physics-school-12-12",topics:[{id:"a",name:"Atomic structure"}]}]).candidates).toEqual([]));
