import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppError, readJson } from "@/lib/security";
import { answerSchema } from "@/lib/domain/validation";
import { db } from "@/lib/db";
import { ownedAttempt } from "@/lib/services/testing";
import { deadlineReached } from "@/lib/domain/scoring";
import { randomUUID } from "node:crypto";
export const PUT = api(async (request, { params }) => {
  const user = await requireUser(),
    { testId } = await params,
    input = answerSchema.parse(await readJson(request));
  const attempt = await ownedAttempt(testId, user.id);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TestAttempt" WHERE "id" = ${attempt.id} FOR UPDATE`;
    const current = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    if (current.status !== "ACTIVE" || deadlineReached(current.deadline))
      throw new AppError(
        "This test has ended. View the result to finalize any expired session.",
        409,
      );
    const question = attempt.test.questions.find(
      (q) => q.id === input.testQuestionId,
    );
    if (!question) throw new AppError("Question is not part of this test", 404);
    const previous = await tx.questionResponse.findUnique({
      where: {
        attemptId_testQuestionId: {
          attemptId: attempt.id,
          testQuestionId: question.id,
        },
      },
    });
    if (input.revision <= (previous?.revision ?? 0)) {
      const identical =
        previous!.selectedOption === input.selectedOption &&
        previous!.marked === input.marked;
      if (!identical)
        throw new AppError(
          "Answers changed in another tab. Refresh to load the latest responses.",
          409,
        );
      return Response.json({
        ok: true,
        revision: previous!.revision,
        selectedOption: previous!.selectedOption,
        marked: previous!.marked,
      });
    }
    if (input.revision !== (previous?.revision ?? 0) + 1)
      throw new AppError(
        "Answer changed in another tab. Refresh to use the latest saved answers.",
        409,
      );
    const data = {
      selectedOption: input.selectedOption,
      marked: input.marked,
      visited: true,
      revision: input.revision,
      changes:
        (previous?.changes ?? 0) +
        (previous && previous.selectedOption !== input.selectedOption ? 1 : 0),
    };
    await tx.questionResponse.upsert({
      where: {
        attemptId_testQuestionId: {
          attemptId: attempt.id,
          testQuestionId: question.id,
        },
      },
      create: { attemptId: attempt.id, testQuestionId: question.id, ...data },
      update: data,
    });
    if (previous?.selectedOption !== input.selectedOption)
      await tx.questionInteractionEvent.create({
        data: {
          id: randomUUID(),
          attemptId: attempt.id,
          testQuestionId: question.id,
          type:
            previous?.selectedOption !== null &&
            previous?.selectedOption !== undefined
              ? "ANSWER_CHANGE"
              : "ANSWER_SELECTED",
        },
      });
    return Response.json({ ok: true, revision: input.revision });
  });
});
