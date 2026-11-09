import { db } from "@/lib/db";
import { asSnapshot, finalizeAttempt } from "@/lib/services/testing";
import { analytics } from "@/lib/domain/scoring";
export async function userPerformance(userId: string) {
  const expired = await db.testAttempt.findMany({
    where: { userId, status: "ACTIVE", deadline: { lte: new Date() } },
    select: { id: true },
  });
  for (const a of expired) await finalizeAttempt(a.id, userId, true);
  const attempts = await db.testAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: {
      test: {
        include: { configuration: true, questions: true, challenge: true },
      },
      responses: true,
    },
  });
  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  // Challenge analysis stays embargoed until closing to keep the common paper fair.
  const visible = submitted.filter(
    (a) => !a.test.challenge || a.test.challenge.endsAt <= new Date(),
  );
  const outcomes = visible.flatMap((a) =>
    a.test.questions.map((q) => {
      const s = asSnapshot(q.snapshot),
        r = a.responses.find((r) => r.testQuestionId === q.id);
      return {
        id: q.id,
        correctOption: s.correctOption,
        selectedOption: r?.selectedOption ?? null,
        activeMs: r?.activeMs ?? 0,
        subject: s.subject,
        chapter: s.chapter,
        topics: s.topics,
      };
    }),
  );
  const aggregate = analytics(outcomes, {
    correctMarks: 4,
    incorrectMarks: 0,
    unansweredMarks: 0,
  });
  const trend = [...visible]
    .reverse()
    .slice(-10)
    .map((a, i) => ({
      name: `Test ${i + 1}`,
      accuracy:
        (a.correct ?? 0) + (a.incorrect ?? 0) > 0
          ? Math.round(
              ((a.correct ?? 0) / ((a.correct ?? 0) + (a.incorrect ?? 0))) *
                100,
            )
          : 0,
      score: a.score ?? 0,
    }));
  return { attempts, submitted, visible, outcomes, aggregate, trend };
}
