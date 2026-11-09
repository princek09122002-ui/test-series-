import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff, requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppError, rateLimit, readJson } from "@/lib/security";
export const POST = api(async (request) => {
  const user = await requireUser(),
    raw = await readJson(request),
    { action } = z
      .object({ action: z.enum(["join", "create", "unpublish"]) })
      .parse(raw);
  if (action === "unpublish") {
    await requireStaff(true);
    const { id } = z.object({ id: z.string() }).parse(raw);
    await db.$transaction([
      db.challenge.update({ where: { id }, data: { published: false } }),
      db.auditLog.create({
        data: { userId: user.id, action: "CHALLENGE_UNPUBLISH", entityId: id },
      }),
    ]);
    return Response.json({ ok: true });
  }
  if (action === "create") {
    await requireStaff(true);
    const input = z
      .object({
        name: z.string().trim().min(3).max(100),
        description: z.string().trim().min(10).max(2000),
        sourceTestId: z.string(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
        public: z.boolean(),
      })
      .parse(raw);
    if (
      new Date(input.endsAt) <= new Date(input.startsAt) ||
      new Date(input.endsAt) <= new Date()
    )
      throw new AppError("Choose a valid future challenge window");
    const challenge = await db.$transaction(async (tx) => {
      const source = await tx.test.findFirst({
        where: {
          id: input.sourceTestId,
          attempts: { some: { userId: user.id } },
          challenge: null,
        },
        include: { configuration: true, questions: true },
      });
      if (
        !source ||
        source.configuration?.mode !== "NEET" ||
        !source.configuration.durationSeconds
      )
        throw new AppError(
          "Choose one of your own timed NEET-style tests as the source paper",
        );
      if (
        new Date(input.endsAt).getTime() - new Date(input.startsAt).getTime() <
        source.configuration.durationSeconds * 1000
      )
        throw new AppError(
          "The challenge window must allow the full test duration",
        );
      const configuration = {
        request: source.configuration.request,
        mode: source.configuration.mode,
        durationSeconds: source.configuration.durationSeconds,
        correctMarks: source.configuration.correctMarks,
        incorrectMarks: source.configuration.incorrectMarks,
        unansweredMarks: source.configuration.unansweredMarks,
        scoringVersion: source.configuration.scoringVersion,
      };
      const test = await tx.test.create({
        data: {
          name: input.name,
          kind: "CHALLENGE",
          syllabusId: source.syllabusId,
          seed: source.seed,
          configuration: {
            create: {
              ...configuration,
              request: configuration.request!,
              instantFeedback: false,
            },
          },
          questions: {
            create: source.questions.map((q) => ({
              questionId: q.questionId,
              position: q.position,
              version: q.version,
              snapshot: q.snapshot!,
            })),
          },
        },
      });
      const challenge = await tx.challenge.create({
        data: {
          name: input.name,
          description: input.description,
          testId: test.id,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          public: input.public,
          published: true,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CHALLENGE_CREATE",
          entityId: challenge.id,
        },
      });
      return challenge;
    });
    return Response.json({ id: challenge.id });
  }
  await rateLimit(`join-challenge:${user.id}`, 20, 3600);
  const { id, inviteCode } = z
    .object({ id: z.string(), inviteCode: z.string().optional() })
    .parse(raw);
  const testId = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Challenge" WHERE "id" = ${id} FOR UPDATE`;
    const challenge = await tx.challenge.findUnique({
      where: { id },
      include: {
        test: {
          include: {
            configuration: true,
            questions: { select: { questionId: true } },
          },
        },
      },
    });
    if (!challenge || !challenge.published)
      throw new AppError("Challenge not found", 404);
    const existing = await tx.challengeParticipation.findUnique({
      where: { challengeId_userId: { challengeId: id, userId: user.id } },
    });
    if (existing) return challenge.testId;
    if (!challenge.public && challenge.inviteCode !== inviteCode)
      throw new AppError("A valid private invitation is required", 403);
    const now = new Date(),
      duration = challenge.test.configuration!.durationSeconds!;
    if (
      now < challenge.startsAt ||
      now.getTime() + duration * 1000 > challenge.endsAt.getTime()
    )
      throw new AppError(
        "This challenge is not accepting starts. Join during its entry window so you receive the full duration.",
      );
    const attempt = await tx.testAttempt.create({
      data: {
        userId: user.id,
        testId: challenge.testId,
        deadline: new Date(now.getTime() + duration * 1000),
      },
    });
    await tx.challengeParticipation.create({
      data: { userId: user.id, challengeId: id, attemptId: attempt.id },
    });
    await tx.questionExposure.createMany({
      data: challenge.test.questions.map((q) => ({
        userId: user.id,
        questionId: q.questionId,
      })),
      skipDuplicates: true,
    });
    return challenge.testId;
  });
  return Response.json({ testId });
});
