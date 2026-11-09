import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppError, readJson } from "@/lib/security";
import { eventSchema } from "@/lib/domain/validation";
import { db } from "@/lib/db";
import { ownedAttempt } from "@/lib/services/testing";
import { deadlineReached } from "@/lib/domain/scoring";
export const POST = api(async (request, { params }) => {
  const user = await requireUser(),
    { testId } = await params,
    event = eventSchema.parse(await readJson(request)),
    attempt = await ownedAttempt(testId, user.id);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TestAttempt" WHERE "id" = ${attempt.id} FOR UPDATE`;
    const current = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    if (current.status !== "ACTIVE" || deadlineReached(current.deadline))
      return;
    if (
      event.testQuestionId &&
      !attempt.test.questions.some((q) => q.id === event.testQuestionId)
    )
      throw new AppError("Invalid question", 404);
    if (
      await tx.questionInteractionEvent.findUnique({ where: { id: event.id } })
    )
      return;
    const last = await tx.questionInteractionEvent.findFirst({
      where: {
        attemptId: attempt.id,
        type: { notIn: ["ANSWER_SELECTED", "ANSWER_CHANGE"] },
      },
      orderBy: { receivedAt: "desc" },
    });
    const ceiling = Math.max(
      0,
      Date.now() - (last?.receivedAt ?? attempt.startedAt).getTime(),
    );
    const activeMs = Math.min(event.activeMs, ceiling);
    await tx.questionInteractionEvent.create({
      data: { ...event, activeMs, attemptId: attempt.id },
    });
    if (event.testQuestionId) {
      const key = {
        attemptId: attempt.id,
        testQuestionId: event.testQuestionId,
      };
      const previous = await tx.questionResponse.findUnique({
        where: { attemptId_testQuestionId: key },
      });
      const visits = (previous?.visits ?? 0) + (event.type === "VISIT" ? 1 : 0);
      await tx.questionResponse.upsert({
        where: { attemptId_testQuestionId: key },
        create: {
          ...key,
          visited: true,
          activeMs,
          firstPassMs: activeMs,
          visits,
        },
        update: {
          visited: true,
          visits,
          activeMs: { increment: activeMs },
          ...(visits <= 1
            ? { firstPassMs: { increment: activeMs } }
            : { revisitMs: { increment: activeMs } }),
        },
      });
    }
  });
  return Response.json({ ok: true });
});
