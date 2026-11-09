import { db } from "@/lib/db";
import { AppError } from "@/lib/security";
import { analytics } from "@/lib/domain/scoring";
import { asSnapshot } from "@/lib/services/testing";
import type { Prisma } from "@/generated/prisma/client";
// Explicit correction only. Prior snapshots and scores are retained in an immutable audit record.
export async function rescoreQuestion(
  input: {
    questionId: string;
    version: number;
    correctOption: number;
    reason: string;
  },
  actorId: string,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ${input.questionId} FOR UPDATE`;
      const questions = await tx.testQuestion.findMany({
        where: { questionId: input.questionId, version: input.version },
      });
      const testIds = [...new Set(questions.map((q) => q.testId))];
      for (const id of [...testIds].sort())
        await tx.$queryRaw`SELECT "id" FROM "TestAttempt" WHERE "testId" = ${id} ORDER BY "id" FOR UPDATE`;
      if (
        await tx.testAttempt.count({
          where: { testId: { in: testIds }, status: "ACTIVE" },
        })
      )
        throw new AppError(
          "Some affected attempts are still active. Finalize them before an explicit historical rescore.",
          409,
        );
      const previousSnapshots = questions.map((q) => ({
        testQuestionId: q.id,
        snapshot: q.snapshot,
      }));
      for (const q of questions) {
        const s = asSnapshot(q.snapshot);
        await tx.testQuestion.update({
          where: { id: q.id },
          data: {
            snapshot: {
              ...s,
              correctOption: input.correctOption,
              correction: {
                reason: input.reason,
                previousCorrectOption: s.correctOption,
                at: new Date().toISOString(),
              },
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }
      const attempts = await tx.testAttempt.findMany({
        where: { testId: { in: testIds }, status: "SUBMITTED" },
        include: {
          test: { include: { questions: true, configuration: true } },
          responses: true,
          analytics: true,
        },
      });
      const changes = [];
      for (const a of attempts) {
        const rows = a.test.questions.map((q) => {
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
        });
        const result = analytics(rows, a.test.configuration!);
        changes.push({
          attemptId: a.id,
          oldScore: a.score,
          newScore: result.score,
          previousAnalytics: a.analytics?.data ?? null,
        });
        await tx.testAttempt.update({
          where: { id: a.id },
          data: {
            score: result.score,
            maximum: result.maximum,
            correct: result.correct,
            incorrect: result.incorrect,
            unattempted: result.unattempted,
          },
        });
        await tx.testAnalyticsSnapshot.upsert({
          where: { attemptId: a.id },
          create: {
            attemptId: a.id,
            data: result as unknown as Prisma.InputJsonValue,
          },
          update: { data: result as unknown as Prisma.InputJsonValue },
        });
        for (const row of rows) {
          if (
            row.selectedOption !== null &&
            row.selectedOption !== row.correctOption
          ) {
            await tx.mistakeRecord.upsert({
              where: {
                attemptId_testQuestionId: {
                  attemptId: a.id,
                  testQuestionId: row.id,
                },
              },
              create: {
                userId: a.userId,
                attemptId: a.id,
                testQuestionId: row.id,
              },
              update: {},
            });
            for (const t of row.topics)
              await tx.revisionTask.upsert({
                where: { userId_topicId: { userId: a.userId, topicId: t.id } },
                create: { userId: a.userId, topicId: t.id },
                update: {},
              });
          } else
            await tx.mistakeRecord.updateMany({
              where: { attemptId: a.id, testQuestionId: row.id },
              data: { reviewed: true },
            });
        }
      }
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "EXPLICIT_HISTORICAL_RESCORE",
          entityId: input.questionId,
          metadata: {
            ...input,
            previousSnapshots,
            changes,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      return {
        updatedAttempts: attempts.length,
        updatedSnapshots: questions.length,
      };
    },
    { timeout: 60000 },
  );
}
