import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppError, readJson } from "@/lib/security";
import { saveQuestion } from "@/lib/services/content";
import { questionSchema } from "@/lib/domain/validation";
import { rescoreQuestion } from "@/lib/services/rescore";
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const POST = api(async (request) => {
  const user = await requireStaff(),
    raw = await readJson(request),
    base = z.object({ action: z.string() }).parse(raw);
  if (base.action === "saveQuestion") {
    const input = z
      .object({ questionId: z.string().optional(), question: questionSchema })
      .parse(raw);
    const q = await db.$transaction((tx) =>
      saveQuestion(input.question, user, input.questionId, tx),
    );
    return Response.json({ ok: true, id: q.id });
  }
  if (base.action === "submitReview") {
    const { id } = z.object({ id: z.string() }).parse(raw),
      q = await db.question.findUnique({ where: { id } });
    if (!q || (user.role !== "ADMIN" && q.authorId !== user.id))
      throw new AppError("Question not found", 404);
    await db.$transaction([
      db.question.update({ where: { id }, data: { status: "PENDING" } }),
      db.auditLog.create({
        data: { userId: user.id, action: "SUBMIT_REVIEW", entityId: id },
      }),
    ]);
    return Response.json({ ok: true });
  }
  await requireStaff(true);
  if (base.action === "rescoreQuestion") {
    const input = z
      .object({
        questionId: z.string(),
        version: z.number().int().min(1),
        correctOption: z.number().int().min(0).max(3),
        reason: z.string().trim().min(20).max(2000),
      })
      .parse(raw);
    return Response.json({
      ok: true,
      ...(await rescoreQuestion(input, user.id)),
    });
  }
  await db.$transaction(
    async (tx) => {
      let entityId = "platform";
      if (base.action === "importQuestions") {
        const { questions } = z
          .object({ questions: z.array(questionSchema).min(1).max(100) })
          .parse(raw);
        for (const q of questions) await saveQuestion(q, user, undefined, tx);
        entityId = `${questions.length} questions`;
      } else if (base.action === "reviewQuestion") {
        const { id, status, notes } = z
          .object({
            id: z.string(),
            status: z.enum(["APPROVED", "REJECTED", "ARCHIVED", "PENDING"]),
            notes: z.string().max(2000).default(""),
          })
          .parse(raw);
        const q = await tx.question.findUnique({
          where: { id },
          include: { options: true, topics: true },
        });
        if (!q || q.options.length !== 4 || !q.topics.some((t) => !t.required))
          throw new AppError(
            "A valid question with four options and topic mappings is required",
          );
        await tx.question.update({
          where: { id },
          data: { status, active: status !== "ARCHIVED" },
        });
        await tx.questionReview.create({
          data: { questionId: id, reviewerId: user.id, status, notes },
        });
        entityId = id;
      } else if (base.action === "updateUser") {
        const { id, role, disabled } = z
          .object({
            id: z.string(),
            role: z.enum(["STUDENT", "EDITOR", "ADMIN"]),
            disabled: z.boolean(),
          })
          .parse(raw);
        if (id === user.id)
          throw new AppError(
            "Use another administrator to change your own account permissions",
          );
        await tx.user.update({
          where: { id },
          data: { role, disabled, sessionVersion: { increment: 1 } },
        });
        await tx.session.deleteMany({ where: { userId: id } });
        entityId = id;
      } else if (base.action === "resolveReport") {
        const { id, resolution } = z
          .object({
            id: z.string(),
            resolution: z.string().trim().min(10).max(2000),
          })
          .parse(raw);
        await tx.questionReport.update({
          where: { id },
          data: { resolved: true, resolution },
        });
        entityId = id;
      } else if (base.action === "createVersion") {
        const { name, year, demo, sourceUrl } = z
          .object({
            name: z.string().trim().min(3).max(100),
            year: z.number().int().min(2026).max(2040),
            demo: z.boolean(),
            sourceUrl: z.string().url(),
          })
          .parse(raw);
        const version = await tx.syllabusVersion.create({
          data: { name, year, demo, sourceUrl, active: false },
        });
        entityId = version.id;
      } else if (base.action === "activateVersion") {
        const { id } = z.object({ id: z.string() }).parse(raw);
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(274601)`;
        const version = await tx.syllabusVersion.findUnique({
          where: { id },
          include: {
            subjects: { include: { chapters: { include: { topics: true } } } },
          },
        });
        if (
          !version ||
          !version.subjects.some((s) => s.chapters.some((c) => c.topics.length))
        )
          throw new AppError(
            "Add subjects, chapters and topics before activating this version",
          );
        await tx.syllabusVersion.updateMany({
          where: { active: true },
          data: { active: false },
        });
        await tx.syllabusVersion.update({
          where: { id },
          data: { active: true },
        });
        entityId = id;
      } else if (base.action === "addSubject") {
        const { syllabusId, name } = z
          .object({
            syllabusId: z.string(),
            name: z.enum(["Physics", "Chemistry", "Biology"]),
          })
          .parse(raw);
        const subject = await tx.subject.create({
          data: { syllabusId, name, slug: slug(name) },
        });
        entityId = subject.id;
      } else if (base.action === "addChapter") {
        const { subjectId, name, classLevel, classification } = z
          .object({
            subjectId: z.string(),
            name: z.string().trim().min(3).max(150),
            classLevel: z.union([z.literal(11), z.literal(12)]),
            classification: z
              .enum(["BOTANY", "ZOOLOGY"])
              .nullable()
              .default(null),
          })
          .parse(raw);
        const chapter = await tx.chapter.create({
          data: {
            subjectId,
            name,
            classLevel,
            classification,
            slug: slug(name),
          },
        });
        entityId = chapter.id;
      } else if (base.action === "addTopic") {
        const { chapterId, name, ncertRef, parentId } = z
          .object({
            chapterId: z.string(),
            name: z.string().trim().min(2).max(150),
            ncertRef: z.string().max(200).default(""),
            parentId: z.string().optional(),
          })
          .parse(raw);
        if (
          parentId &&
          !(await tx.topic.findFirst({ where: { id: parentId, chapterId } }))
        )
          throw new AppError("A subtopic parent must belong to this chapter");
        const topic = await tx.topic.create({
          data: { chapterId, name, ncertRef, parentId, slug: slug(name) },
        });
        entityId = topic.id;
      } else if (base.action === "revisionSettings") {
        const { intervals } = z
          .object({
            intervals: z
              .array(z.number().int().min(0).max(365))
              .min(2)
              .max(10)
              .refine(
                (v) => v.every((n, i) => i === 0 || n >= v[i - 1]),
                "Intervals must be non-decreasing",
              ),
          })
          .parse(raw);
        await tx.platformSettings.upsert({
          where: { key: "revisionIntervals" },
          create: { key: "revisionIntervals", value: intervals },
          update: { value: intervals },
        });
      } else if (base.action === "createBlueprint") {
        const input = z
          .object({
            name: z.string().min(3).max(100),
            syllabusId: z.string(),
            totalQuestions: z.number().int().min(1).max(180),
            durationMinutes: z.number().int().min(1).max(360),
            sections: z
              .array(
                z.object({
                  subjectId: z.string(),
                  count: z.number().int().min(1).max(180),
                }),
              )
              .min(1)
              .max(3),
          })
          .parse(raw);
        if (
          input.sections.reduce((a, s) => a + s.count, 0) !==
          input.totalQuestions
        )
          throw new AppError("Section counts must sum to the total");
        const subjects = await tx.subject.findMany({
          where: {
            syllabusId: input.syllabusId,
            id: { in: input.sections.map((s) => s.subjectId) },
          },
        });
        if (subjects.length !== input.sections.length)
          throw new AppError(
            "All sections must refer to distinct subjects in the blueprint syllabus",
          );
        const latest = await tx.examBlueprint.findFirst({
          where: { syllabusId: input.syllabusId },
          orderBy: { version: "desc" },
        });
        await tx.examBlueprint.updateMany({
          where: { syllabusId: input.syllabusId },
          data: { active: false },
        });
        const { sections, ...fields } = input,
          b = await tx.examBlueprint.create({
            data: {
              ...fields,
              version: (latest?.version ?? 0) + 1,
              sections: { create: sections },
            },
          });
        entityId = b.id;
      } else throw new AppError("Unsupported administrative action");
      await tx.auditLog.create({
        data: { userId: user.id, action: base.action, entityId },
      });
    },
    { timeout: 30000 },
  );
  return Response.json({ ok: true });
});
