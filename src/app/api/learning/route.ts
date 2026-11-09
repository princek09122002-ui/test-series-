import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppError, readJson } from "@/lib/security";
import { nextReview } from "@/lib/domain/revision";
import { ownedAttempt } from "@/lib/services/testing";
export const POST = api(async (request) => {
  const user = await requireUser();
  const input = z
    .discriminatedUnion("action", [
      z.object({
        action: z.literal("bookmark"),
        testId: z.string(),
        testQuestionId: z.string(),
        enabled: z.boolean(),
      }),
      z.object({
        action: z.literal("report"),
        testId: z.string(),
        testQuestionId: z.string(),
        message: z.string().trim().min(10).max(2000),
      }),
      z.object({ action: z.literal("revise"), topicId: z.string() }),
      z.object({
        action: z.literal("review"),
        taskId: z.string(),
        remembered: z.boolean(),
      }),
      z.object({
        action: z.literal("mistake"),
        mistakeId: z.string(),
        category: z.enum([
          "UNCATEGORIZED",
          "CONCEPT",
          "FORGOTTEN",
          "CALCULATION",
          "MISREAD",
          "GUESSING",
          "TIME_PRESSURE",
          "OTHER",
        ]),
        reviewed: z.boolean(),
      }),
    ])
    .parse(await readJson(request));
  if (input.action === "bookmark" || input.action === "report") {
    const attempt = await ownedAttempt(input.testId, user.id),
      q = attempt.test.questions.find((q) => q.id === input.testQuestionId);
    if (!q) throw new AppError("Question not found", 404);
    if (input.action === "bookmark") {
      if (input.enabled)
        await db.bookmark.upsert({
          where: {
            userId_questionId: { userId: user.id, questionId: q.questionId },
          },
          create: { userId: user.id, questionId: q.questionId },
          update: {},
        });
      else
        await db.bookmark.deleteMany({
          where: { userId: user.id, questionId: q.questionId },
        });
    } else
      await db.questionReport.create({
        data: {
          userId: user.id,
          questionId: q.questionId,
          message: input.message,
        },
      });
  } else if (input.action === "revise") {
    const evidence = await db.questionResponse.findFirst({
      where: {
        attempt: { userId: user.id, status: "SUBMITTED" },
        testQuestion: {
          question: {
            topics: { some: { topicId: input.topicId, required: false } },
          },
        },
      },
    });
    if (!evidence)
      throw new AppError(
        "Complete an assessment on this topic before adding a revision task",
      );
    await db.revisionTask.upsert({
      where: { userId_topicId: { userId: user.id, topicId: input.topicId } },
      create: { userId: user.id, topicId: input.topicId },
      update: { completedAt: null, dueAt: new Date() },
    });
  } else if (input.action === "review") {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "RevisionTask" WHERE "id" = ${input.taskId} FOR UPDATE`;
      const task = await tx.revisionTask.findFirst({
        where: { id: input.taskId, userId: user.id },
      });
      if (!task) throw new AppError("Revision task not found", 404);
      const settings = await tx.platformSettings.findUnique({
        where: { key: "revisionIntervals" },
      });
      const intervals = z
        .array(z.number().int().min(0).max(365))
        .min(2)
        .max(10)
        .safeParse(settings?.value);
      const next = nextReview(
        task.step,
        input.remembered,
        new Date(),
        intervals.success ? intervals.data : undefined,
      );
      await tx.revisionTask.update({
        where: { id: task.id },
        data: {
          step: next.step,
          dueAt: next.dueAt,
          lastReviewed: new Date(),
          completedAt: next.complete ? new Date() : null,
        },
      });
      await tx.revisionAttempt.create({
        data: {
          taskId: task.id,
          outcome: input.remembered ? "REMEMBERED" : "RELEARN",
        },
      });
    });
  } else {
    const changed = await db.mistakeRecord.updateMany({
      where: { id: input.mistakeId, userId: user.id },
      data: { category: input.category, reviewed: input.reviewed },
    });
    if (!changed.count) throw new AppError("Mistake not found", 404);
  }
  return Response.json({ ok: true });
});
