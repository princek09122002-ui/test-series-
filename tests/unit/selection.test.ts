import { it, expect } from "vitest";
import { removeTopicFromFullChapter } from "../../src/lib/domain/selection";
it("deselects a topic even after select-all materializes full-chapter topics", () => {
  expect(
    removeTopicFromFullChapter(
      ["units-a", "motion-a", "motion-b", "current-a"],
      ["motion-a", "motion-b"],
      "motion-a",
    ),
  ).toEqual(["units-a", "motion-b", "current-a"]);
});
it("keeps every other topic when converting full chapter to partial selection", () => {
  expect(
    removeTopicFromFullChapter(
      ["current-a"],
      ["motion-a", "motion-b"],
      "motion-a",
    ),
  ).toEqual(["current-a", "motion-b"]);
});
