import { it, expect } from "vitest";
import {
  chemistryChapterCandidates,
  suggestChemistryMapping,
} from "../../src/lib/domain/chemistry-classification";
import { coverageAllocations } from "../../src/lib/domain/section-coverage";
import {
  expandTopicSelection,
  removeTopicSelection,
} from "../../src/lib/domain/selection";
import { testConfigSchema } from "../../src/lib/domain/validation";
import syllabus from "../fixtures/chemistry-syllabus.json";
it("normalizes distinct source labels without creating invented chapters", () => {
  expect(chemistryChapterCandidates("Chemical Equilibrium")).toEqual(
    chemistryChapterCandidates("Ionic Equilibrium"),
  );
  expect(
    chemistryChapterCandidates("Organic Compounds Containing Nitrogen"),
  ).toEqual(["chemistry-school-12-9"]);
  expect(chemistryChapterCandidates("Nuclear Chemistry")).toEqual([]);
  expect(chemistryChapterCandidates("p-Block Elements")).toEqual([
    "chemistry-school-11-formative-block",
  ]);
});
it("does not approve a mapping based solely on the source title", () =>
  expect(
    suggestChemistryMapping("Electrochemistry", "", syllabus).candidates,
  ).toEqual([]));
it("uses actual Nernst content for a conservative topic suggestion", () => {
  const r = suggestChemistryMapping(
    "Electrochemistry",
    "Use the Nernst equation to calculate cell potential",
    syllabus,
  );
  expect(
    r.candidates.some((c) => c.chapterId === "chemistry-school-12-2"),
  ).toBe(true);
  expect(r.status).toBe("UNREVIEWED");
  expect(r.primaryTopicId).toBeNull();
});
it("expands selected parents but never includes unrelated siblings or ancestors", () => {
  const topics = [
    { id: "p" },
    { id: "a", parentId: "p" },
    { id: "b", parentId: "p" },
    { id: "z" },
  ];
  expect(expandTopicSelection(["p"], topics)).toEqual(["p", "a", "b"]);
  expect(expandTopicSelection(["a"], topics)).toEqual(["a"]);
  expect(removeTopicSelection(["p", "a", "z"], topics, "a")).toEqual([
    "z",
    "b",
  ]);
  expect(removeTopicSelection(["p", "a", "b", "z"], topics, "p")).toEqual([
    "z",
  ]);
});
it("does not fill an absent Chemistry category using another category", () =>
  expect(() =>
    coverageAllocations(
      [],
      {},
      { "11 | Organic Chemistry": 6 },
      "seed",
      undefined,
      "Chemistry",
    ),
  ).toThrow("Organic Chemistry: need 6"));
it("validates manual subject totals before database work", () => {
  const raw = {
    name: "Mixed subjects",
    kind: "CUSTOM",
    topicIds: ["a"],
    count: 35,
    mode: "NEET",
    durationMinutes: 35,
    difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
    exposure: "ALL",
    allocation: "MANUAL_SUBJECT",
    chapterCounts: {},
    subjectCounts: { physics: 15, chemistry: 20 },
  };
  expect(testConfigSchema.safeParse(raw).success).toBe(true);
  expect(
    testConfigSchema.safeParse({
      ...raw,
      subjectCounts: { physics: 15, chemistry: 19 },
    }).success,
  ).toBe(false);
});
