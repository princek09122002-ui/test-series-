import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { questionSchema } from "@/lib/domain/validation";
import { AppError } from "@/lib/security";
import { questionInclude, snapshotQuestion } from "@/lib/services/testing";
export async function saveQuestion(
  raw: unknown,
  user: { id: string; role: string },
  questionId?: string,
  tx: Prisma.TransactionClient = db,
) {
  const data = questionSchema.parse(raw),
    chapter = await tx.chapter.findUnique({
      where: { id: data.chapterId },
      include: { subject: true },
    });
  if (!chapter || !chapter.active)
    throw new AppError("Select an active chapter");
  const ids = [...new Set([...data.topicIds, ...data.prerequisiteIds])];
  const topics = await tx.topic.findMany({
    where: {
      id: { in: ids },
      active: true,
      chapter: { subject: { syllabusId: chapter.subject.syllabusId } },
    },
  });
  if (
    topics.length !== ids.length ||
    data.topicIds.some(
      (id) => !topics.some((t) => t.id === id && t.chapterId === chapter.id),
    )
  )
    throw new AppError(
      "Primary topics must belong to this chapter; prerequisite topics must belong to the same syllabus",
    );
  const existing = questionId
    ? await tx.question.findUnique({ where: { id: questionId } })
    : null;
  if (questionId && !existing) throw new AppError("Question not found", 404);
  if (existing && user.role !== "ADMIN" && existing.authorId !== user.id)
    throw new AppError("Editors may change only questions they authored", 403);
  const { options, topicIds, prerequisiteIds, media, ...fields } = data;
  const relations = {
    options: { create: options.map((text, position) => ({ text, position })) },
    topics: {
      create: [...new Set(topicIds)]
        .map((topicId) => ({ topicId, required: false }))
        .concat(
          [...new Set(prerequisiteIds)]
            .filter((id) => !topicIds.includes(id))
            .map((topicId) => ({ topicId, required: true })),
        ),
    },
    media: { create: media },
  };
  const q = existing
    ? await tx.question.update({
        where: { id: existing.id },
        data: {
          ...fields,
          status: "DRAFT",
          version: { increment: 1 },
          options: { deleteMany: {}, ...relations.options },
          topics: { deleteMany: {}, ...relations.topics },
          media: { deleteMany: {}, ...relations.media },
        },
        include: questionInclude,
      })
    : await tx.question.create({
        data: { ...fields, authorId: user.id, ...relations },
        include: questionInclude,
      });
  await tx.questionVersion.create({
    data: {
      questionId: q.id,
      version: q.version,
      snapshot: snapshotQuestion(q) as unknown as Prisma.InputJsonValue,
    },
  });
  await tx.auditLog.create({
    data: {
      userId: user.id,
      action: existing ? "QUESTION_EDIT" : "QUESTION_CREATE",
      entityId: q.id,
    },
  });
  return q;
}
