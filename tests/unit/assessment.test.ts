import { describe, expect, it } from "vitest";
import {
  analytics,
  deadlineReached,
  markingFor,
  score,
} from "../../src/lib/domain/scoring";
import {
  eligible,
  quotas,
  selectQuestions,
} from "../../src/lib/domain/generation";
import { nextReview } from "../../src/lib/domain/revision";
import { testConfigSchema } from "../../src/lib/domain/validation";
import type { Candidate, Outcome } from "../../src/lib/domain/types";
const q = (
  id: string,
  chapterId = "a",
  difficulty: Candidate["difficulty"] = "EASY",
): Candidate => ({
  id,
  chapterId,
  subjectId: "chemistry",
  difficulty,
  topicIds: ["selected"],
  prerequisiteIds: [],
});
describe("scoring & analytics", () => {
  const outcomes = [
    { correctOption: 0, selectedOption: 0 },
    { correctOption: 1, selectedOption: 0 },
    { correctOption: 2, selectedOption: null },
  ];
  it("applies +4 / −1 / 0 NEET scoring", () =>
    expect(score(outcomes, markingFor("NEET"))).toMatchObject({
      score: 3,
      maximum: 12,
      correct: 1,
      incorrect: 1,
      unattempted: 1,
      accuracy: 50,
    }));
  it("does not deduct for practice mistakes", () =>
    expect(score(outcomes, markingFor("TIMED")).score).toBe(4));
  it("uses answered questions as the accuracy denominator", () =>
    expect(score(outcomes, markingFor("LEARNING")).attemptRate).toBeCloseTo(
      66.6666,
      3,
    ));
  it("keeps accuracy unknown when all questions are unanswered", () =>
    expect(
      score([{ correctOption: 0, selectedOption: null }], markingFor("NEET")),
    ).toMatchObject({ score: 0, accuracy: null }));
  it("allows negative marks", () =>
    expect(
      score([{ correctOption: 1, selectedOption: 0 }], markingFor("NEET"))
        .score,
    ).toBe(-1));
  it("splits shared-topic time without doubling total active time", () => {
    const row: Outcome = {
      id: "q",
      correctOption: 0,
      selectedOption: 0,
      activeMs: 10000,
      subject: "Chemistry",
      chapter: "Atomic structure",
      topics: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    };
    const result = analytics([row], markingFor("NEET"));
    expect(result.activeMs).toBe(10000);
    expect(result.topics.map((t) => t.activeMs)).toEqual([5000, 5000]);
    expect(result.topics[0].observations).toBe(1);
  });
  it("calculates median correctly for even samples", () => {
    const row: Outcome = {
      id: "q",
      correctOption: 0,
      selectedOption: 0,
      activeMs: 10000,
      subject: "Physics",
      chapter: "Motion",
      topics: [],
    };
    expect(
      analytics([row, { ...row, activeMs: 30000 }], markingFor("NEET"))
        .medianMs,
    ).toBe(20000);
  });
});
describe("strict question eligibility", () => {
  it("excludes questions containing an unselected primary topic", () =>
    expect(
      eligible(
        { ...q("1"), topicIds: ["selected", "unselected"] },
        new Set(["selected"]),
      ),
    ).toBe(false));
  it("excludes questions with unselected prerequisites", () =>
    expect(
      eligible(
        { ...q("1"), prerequisiteIds: ["quantum"] },
        new Set(["selected"]),
      ),
    ).toBe(false));
  it("allows explicitly selected prerequisites", () =>
    expect(
      eligible(
        { ...q("1"), prerequisiteIds: ["quantum"] },
        new Set(["selected", "quantum"]),
      ),
    ).toBe(true));
  it("rejects questions with no primary topic mappings", () =>
    expect(eligible({ ...q("1"), topicIds: [] }, new Set(["selected"]))).toBe(
      false,
    ));
});
describe("test generation", () => {
  it("uses largest remainders to preserve total difficulty count", () =>
    expect(quotas(7, { EASY: 30, MEDIUM: 50, HARD: 20 })).toEqual({
      EASY: 2,
      MEDIUM: 4,
      HARD: 1,
    }));
  it("prevents duplicates even if candidate input repeats", () =>
    expect(() =>
      selectQuestions(
        [q("1"), q("1")],
        2,
        { EASY: 100, MEDIUM: 0, HARD: 0 },
        "seed",
      ),
    ).toThrow(/Insufficient/));
  it("selects deterministically from a persisted seed", () => {
    const pool = Array.from({ length: 20 }, (_, i) => q(String(i)));
    expect(
      selectQuestions(pool, 5, { EASY: 100, MEDIUM: 0, HARD: 0 }, "fixed"),
    ).toEqual(
      selectQuestions(pool, 5, { EASY: 100, MEDIUM: 0, HARD: 0 }, "fixed"),
    );
  });
  it("does not silently lower the requested question count", () =>
    expect(() =>
      selectQuestions([q("1")], 2, { EASY: 100, MEDIUM: 0, HARD: 0 }, "x"),
    ).toThrow(/Insufficient/));
  it("supports any difficulty while preserving chapter coverage", () => {
    const result = selectQuestions(
      [q("ae", "a"), q("am", "a", "MEDIUM"), q("bh", "b", "HARD")],
      2,
      { EASY: 100, MEDIUM: 0, HARD: 0 },
      "any",
      undefined,
      "chapterId",
      "ANY",
    );
    expect(new Set(result.map((question) => question.chapterId))).toEqual(new Set(["a", "b"]));
    expect(result.some((question) => question.difficulty !== "EASY")).toBe(true);
  });
  it("rejects difficulty shortages even when total supply suffices", () =>
    expect(() =>
      selectQuestions(
        [q("1"), q("2")],
        2,
        { EASY: 50, MEDIUM: 50, HARD: 0 },
        "x",
      ),
    ).toThrow(/requested mix/));
  it("honors manual chapter and difficulty margins using flow rather than greedy allocation", () => {
    const pool = [q("ae", "a"), q("am", "a", "MEDIUM"), q("be", "b")];
    const picked = selectQuestions(
      pool,
      2,
      { EASY: 50, MEDIUM: 50, HARD: 0 },
      "x",
      { a: 1, b: 1 },
    );
    expect(picked.map((q) => q.id).sort()).toEqual(["am", "be"]);
  });
  it("rejects mutually incompatible chapter and difficulty constraints", () =>
    expect(() =>
      selectQuestions(
        [q("ae", "a"), q("am", "a", "MEDIUM"), q("be", "b")],
        2,
        { EASY: 50, MEDIUM: 50, HARD: 0 },
        "x",
        { a: 0, b: 2 },
      ),
    ).toThrow(/cannot both be met/));
  it("rejects manual counts that do not sum exactly", () =>
    expect(() =>
      selectQuestions(
        [q("a"), q("b")],
        2,
        { EASY: 100, MEDIUM: 0, HARD: 0 },
        "x",
        { a: 1 },
      ),
    ).toThrow(/adding/));
  it("balances automatic chapter coverage where supply permits", () => {
    const result = selectQuestions(
      [q("a1", "a"), q("a2", "a"), q("b1", "b"), q("b2", "b")],
      2,
      { EASY: 100, MEDIUM: 0, HARD: 0 },
      "x",
    );
    expect(new Set(result.map((q) => q.chapterId)).size).toBe(2);
  });
  it("matches quotas and uniqueness across many test lengths", () => {
    const pool = Array.from({ length: 180 }, (_, i) =>
      q(String(i), String(i % 5), (["EASY", "MEDIUM", "HARD"] as const)[i % 3]),
    );
    for (let count = 1; count <= 100; count++) {
      const result = selectQuestions(
          pool,
          count,
          { EASY: 30, MEDIUM: 50, HARD: 20 },
          `seed${count}`,
        ),
        expected = quotas(count, { EASY: 30, MEDIUM: 50, HARD: 20 });
      expect(result.length).toBe(count);
      expect(new Set(result.map((q) => q.id)).size).toBe(count);
      for (const d of ["EASY", "MEDIUM", "HARD"] as const)
        expect(result.filter((q) => q.difficulty === d).length).toBe(
          expected[d],
        );
    }
  });
});
describe("session deadlines & revision", () => {
  it("expires at the exact deadline, not one second later", () => {
    const d = new Date("2026-11-03T12:00:00Z");
    expect(deadlineReached(d, d)).toBe(true);
    expect(deadlineReached(d, new Date(d.getTime() - 1))).toBe(false);
    expect(deadlineReached(null, d)).toBe(false);
  });
  it("schedules 3-day first successful recall and same-day relearning", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    expect(nextReview(0, true, now).dueAt.toISOString()).toBe(
      "2026-11-06T12:00:00.000Z",
    );
    expect(nextReview(2, false, now)).toMatchObject({
      step: 0,
      dueAt: now,
      complete: false,
    });
  });
  it("marks the cycle complete after its final interval", () =>
    expect(nextReview(3, true).complete).toBe(true));
  it("rejects configurations with inconsistent allocation or hints in exam mode", () => {
    const input = {
      name: "Test config",
      kind: "CUSTOM",
      topicIds: ["t"],
      count: 10,
      mode: "NEET",
      durationMinutes: 10,
      difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
      exposure: "ALL",
      allocation: "MANUAL",
      chapterCounts: { a: 5 },
      instantFeedback: true,
    };
    expect(testConfigSchema.safeParse(input).success).toBe(false);
  });
});
