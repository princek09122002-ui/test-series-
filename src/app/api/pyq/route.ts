import { eligibleBankWhere } from "@/lib/services/publication";
import { randomUUID, randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { readJson, rateLimit, AppError } from "@/lib/security";
import { questionInclude, snapshotQuestion } from "@/lib/services/testing";
import type { Prisma } from "@/generated/prisma/client";
export const POST = api(async (request) => {
  const user = await requireUser();
  await rateLimit(`pyq:${user.id}`, 30, 3600);
  const input = z
    .object({
      paper: z.string().max(160),
      subject: z.enum(["All", "Biology", "Chemistry", "Physics"]),
      count: z.number().int().min(1).max(180),
    })
    .parse(await readJson(request));
  const pool = await db.question.findMany({
    where: {
      ...eligibleBankWhere,
      tags: { has: input.paper },
      chapter: {
        active: true,
        subject: {
          syllabusId: "pyq-archive",
          ...(input.subject === "All" ? {} : { name: input.subject }),
        },
      },
    },
    include: questionInclude,
  });
  if (pool.length < input.count)
    throw new AppError(
      `Only ${pool.length} questions are available for this selection`,
      422,
    );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, input.count);
  const result = await db.$transaction(
    async (tx) => {
      const test = await tx.test.create({
        data: {
          name: `PYQ practice · ${chosen[0].source.split("|")[0].trim()}`,
          kind: "PYQ",
          syllabusId: "pyq-archive",
          seed: randomUUID(),
          configuration: {
            create: {
              request: input,
              mode: "NEET",
              durationSeconds: input.count * 60,
              correctMarks: 4,
              incorrectMarks: -1,
              unansweredMarks: 0,
              instantFeedback: false,
            },
          },
          questions: {
            create: chosen.map((q, position) => ({
              questionId: q.id,
              position,
              version: q.version,
              snapshot: snapshotQuestion(q) as unknown as Prisma.InputJsonValue,
            })),
          },
        },
      });
      await tx.testAttempt.create({
        data: {
          userId: user.id,
          testId: test.id,
          deadline: new Date(Date.now() + input.count * 60000),
        },
      });
      await tx.questionExposure.createMany({
        data: chosen.map((q) => ({ userId: user.id, questionId: q.id })),
        skipDuplicates: true,
      });
      return { testId: test.id };
    },
    { timeout: 20000 },
  );
  return Response.json(result, { status: 201 });
});
