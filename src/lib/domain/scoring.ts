import type { Marking, Mode, Outcome } from "./types";
export const MARKING_VERSION = "v1";
export function markingFor(mode: Mode): Marking {
  return {
    correctMarks: 4,
    incorrectMarks: mode === "NEET" ? -1 : 0,
    unansweredMarks: 0,
  };
}
export function score(
  outcomes: Pick<Outcome, "correctOption" | "selectedOption">[],
  marking: Marking,
) {
  let correct = 0,
    incorrect = 0,
    unattempted = 0;
  for (const outcome of outcomes) {
    if (outcome.selectedOption === null) unattempted++;
    else if (outcome.selectedOption === outcome.correctOption) correct++;
    else incorrect++;
  }
  const attempted = correct + incorrect;
  return {
    correct,
    incorrect,
    unattempted,
    attempted,
    accuracy: attempted ? (correct / attempted) * 100 : null,
    attemptRate: outcomes.length ? (attempted / outcomes.length) * 100 : 0,
    score:
      correct * marking.correctMarks +
      incorrect * marking.incorrectMarks +
      unattempted * marking.unansweredMarks,
    maximum: outcomes.length * marking.correctMarks,
  };
}
export function analytics(outcomes: Outcome[], marking: Marking) {
  const aggregate = (key: "subject" | "chapter") =>
    [...new Set(outcomes.map((o) => o[key]))].map((name) => {
      const rows = outcomes.filter((o) => o[key] === name);
      return {
        name,
        count: rows.length,
        activeMs: rows.reduce((a, o) => a + o.activeMs, 0),
        ...score(rows, marking),
      };
    });
  const topicIds = [
    ...new Set(outcomes.flatMap((o) => o.topics.map((t) => t.id))),
  ];
  const topics = topicIds.map((id) => {
    const rows = outcomes.filter((o) => o.topics.some((t) => t.id === id));
    return {
      id,
      name: rows[0].topics.find((t) => t.id === id)!.name,
      observations: rows.length,
      activeMs: rows.reduce((a, o) => a + o.activeMs / o.topics.length, 0),
      ...score(rows, marking),
    };
  });
  const times = outcomes
    .filter((o) => o.activeMs > 0)
    .map((o) => o.activeMs)
    .sort((a, b) => a - b);
  const medianMs = !times.length
    ? 0
    : times.length % 2
      ? times[Math.floor(times.length / 2)]
      : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;
  return {
    ...score(outcomes, marking),
    activeMs: outcomes.reduce((a, o) => a + o.activeMs, 0),
    medianMs,
    subjects: aggregate("subject"),
    chapters: aggregate("chapter"),
    topics,
  };
}
export function deadlineReached(deadline: Date | null, now = new Date()) {
  return deadline !== null && now.getTime() >= deadline.getTime();
}
