import { describe, expect, it } from "vitest";
import {
  biologyChapterCandidate,
  suggestBiologyMapping,
} from "../../src/lib/domain/biology-classification";
import { testConfigSchema } from "../../src/lib/domain/validation";

describe("Biology review and assessment boundaries", () => {
  it("maps source chapters only as unreviewed candidates", () => {
    expect(biologyChapterCandidate("Cell - The Unit of Life")).toBe("biology-school-11-8");
    expect(biologyChapterCandidate("Molecular Basis of Inheritance")).toBe("biology-school-12-5");
    expect(biologyChapterCandidate("Unknown Biology chapter")).toBeNull();
    const suggestion = suggestBiologyMapping(
      "Molecular Basis of Inheritance",
      "Which lac operon regulation applies?",
      [{ id: "biology-school-12-5", category: "Mixed", topics: [{ id: "lac", name: "lac operon regulation" }] }],
    );
    expect(suggestion.candidateChapterIds).toEqual(["biology-school-12-5"]);
    expect(suggestion.candidates[0].topicId).toBe("lac");
    expect(suggestion.status).toBe("UNREVIEWED");
    expect(suggestion.primaryTopicId).toBeNull();
    expect(suggestion.eligibility).toBe("UNVERIFIED");
  });

  it("accepts the Biology section only with a valid request shape", () => {
    const parsed = testConfigSchema.parse({
      name: "Biology section",
      kind: "BIOLOGY_SECTION",
      topicIds: [],
      fullChapterIds: [],
      count: 90,
      mode: "NEET",
      durationMinutes: 90,
      difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
      exposure: "ALL",
      allocation: "AUTO",
      chapterCounts: {},
    });
    expect(parsed.kind).toBe("BIOLOGY_SECTION");
    expect(parsed.count).toBe(90);
  });
});
