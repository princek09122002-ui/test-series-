import { expandTopicSelection } from "../domain/selection";
import { coverageAllocations } from "../domain/section-coverage";
import { physicsAllocations } from "../domain/physics";
import { eligibleBankWhere } from "./publication";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { testConfigSchema, type TestConfig } from "@/lib/domain/validation";
import {
  eligible,
  GenerationError,
  quotas,
  selectQuestions,
} from "@/lib/domain/generation";
import { analytics, deadlineReached, markingFor } from "@/lib/domain/scoring";
import type {
  Candidate,
  QuestionSnapshot,
  SafeQuestion,
} from "@/lib/domain/types";
import { AppError } from "@/lib/security";

export const questionInclude = {
  options: { orderBy: { position: "asc" as const } },
  topics: { include: { topic: true } },
  media: true,
  chapter: { include: { subject: true } },
};
type QuestionWithRelations = Prisma.QuestionGetPayload<{
  include: typeof questionInclude;
}>;
export function snapshotQuestion(q: QuestionWithRelations): QuestionSnapshot {
  return {
    id: q.id,
    text: q.text,
    ...(q.structuredContent ? {structuredContent:q.structuredContent as unknown as QuestionSnapshot['structuredContent']} : {}),
    options: q.options.map((o) => o.text),
    correctOption: q.correctOption,
    explanation: q.explanation,
    difficulty: q.difficulty,
    chapterId: q.chapterId,
    chapter: q.chapter.name,
    subjectId: q.chapter.subjectId,
    subject: q.chapter.subject.name,
    classLevel: q.chapter.classLevel,
    topics: q.topics
      .filter((t) => !t.required)
      .map((t) => ({ id: t.topicId, name: t.topic.name })),
    prerequisites: q.topics.filter((t) => t.required).map((t) => t.topicId),
    media: q.media.map((m) => ({ url: m.url, alt: m.alt })),
  };
}
export const asSnapshot = (data: Prisma.JsonValue) =>
  data as unknown as QuestionSnapshot;
export async function preparePool(
  userId: string,
  config: TestConfig,
  tx: Prisma.TransactionClient = db,
) {
  const syllabus = await tx.syllabusVersion.findFirst({
    where: { active: true },
    include: {
      subjects: {
        include: {
          chapters: {
            where: { active: true },
            include: { topics: { where: { active: true } } },
          },
        },
      },
    },
  });
  if (!syllabus)
    throw new AppError(
      "No active syllabus is configured. Contact an administrator.",
      503,
    );
  const chapters = syllabus.subjects.flatMap((s) => s.chapters),
    allTopics = chapters.flatMap((c) => c.topics);
  let selectedIds = [...config.topicIds];
  if (config.kind === "CLASS_11" || config.kind === "CLASS_12")
    selectedIds = chapters
      .filter((c) => c.classLevel === (config.kind === "CLASS_11" ? 11 : 12))
      .flatMap((c) => c.topics.map((t) => t.id));
  if (config.kind === "FULL_MOCK") selectedIds = allTopics.map((t) => t.id);
  for (const id of config.fullChapterIds) {
    const chapter = chapters.find((c) => c.id === id);
    if (!chapter)
      throw new AppError(
        "A selected chapter is inactive or belongs to a different syllabus",
      );
    selectedIds.push(...chapter.topics.map((t) => t.id));
  }
  if (
    config.kind === "PHYSICS_SECTION" ||
    config.kind === "CHEMISTRY_SECTION" ||
    config.kind === "BIOLOGY_SECTION"
  )
    selectedIds = syllabus.subjects
      .filter(
        (s) =>
          s.name ===
          (config.kind === "BIOLOGY_SECTION"
            ? "Biology"
            : config.kind === "CHEMISTRY_SECTION"
              ? "Chemistry"
              : "Physics"),
      )
      .flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => t.id)));
  const selected = new Set(expandTopicSelection(selectedIds, allTopics));
  if (!selected.size) throw new AppError("Select at least one eligible topic");
  if ([...selected].some((id) => !allTopics.some((t) => t.id === id)))
    throw new AppError(
      "A selected topic is inactive or belongs to another syllabus",
    );
  if (
    config.allocation === "MANUAL" &&
    Object.entries(config.chapterCounts).some(
      ([id, n]) =>
        n > 0 &&
        !chapters.some(
          (c) => c.id === id && c.topics.some((t) => selected.has(t.id)),
        ),
    )
  )
    throw new AppError("Manual allocations include an unselected chapter");
  if (
    config.allocation === "MANUAL_SUBJECT" &&
    Object.entries(config.subjectCounts ?? {}).some(
      ([id, n]) =>
        n > 0 &&
        !chapters.some(
          (c) => c.subjectId === id && c.topics.some((t) => selected.has(t.id)),
        ),
    )
  )
    throw new AppError("Manual allocations include an unselected subject");
  const reserved = await tx.testQuestion.findMany({
    where: {
      test: { challenge: { published: true, endsAt: { gt: new Date() } } },
    },
    select: { questionId: true },
  });
  const questions = await tx.question.findMany({
    where: {
      id: { notIn: reserved.map((q) => q.questionId) },
      ...eligibleBankWhere,
      ...(config.sourceFilter === "PYQ" ? { tags: { has: "PYQ" } } : {}),
      ...(config.yearPreset !== "LAST10" && (config.yearFrom || config.yearTo)
        ? {
            examYear: {
              gte: config.yearFrom ?? undefined,
              lte: config.yearTo ?? undefined,
            },
          }
        : {}),
      language: config.language,
      chapter: { active: true, subject: { syllabusId: syllabus.id } },
      topics: { some: { topicId: { in: [...selected] }, required: false } },
    },
    include: questionInclude,
  });
  const exposures = await tx.questionExposure.findMany({
    where: { userId },
    select: { questionId: true },
  });
  const seen = new Set(exposures.map((e) => e.questionId));
  const bookmarks =
    config.exposure === "BOOKMARKED"
      ? new Set(
          (await tx.bookmark.findMany({ where: { userId } })).map(
            (b) => b.questionId,
          ),
        )
      : new Set<string>();
  const incorrectRows =
    config.exposure === "INCORRECT"
      ? await tx.mistakeRecord.findMany({
          where: { userId },
          include: {
            testQuestion: {
              select: { id: true, questionId: true, snapshot: true },
            },
            attempt: { include: { responses: true } },
          },
        })
      : [];
  const incorrect = new Set(
    incorrectRows
      .filter((m) => {
        const response = m.attempt.responses.find(
          (r) => r.testQuestionId === m.testQuestionId,
        );
        return (
          response?.selectedOption !== null &&
          response?.selectedOption !== undefined &&
          response.selectedOption !==
            asSnapshot(m.testQuestion.snapshot).correctOption
        );
      })
      .map((m) => m.testQuestion.questionId),
  );
  const pool = questions.filter((q) => {
    const candidate = {
      topicIds: q.topics.filter((t) => !t.required).map((t) => t.topicId),
      prerequisiteIds: q.topics.filter((t) => t.required).map((t) => t.topicId),
    } as Candidate;
    if (q.topics.some((t) => !t.topic.active) || !eligible(candidate, selected))
      return false;
    return config.exposure === "UNSEEN"
      ? !seen.has(q.id)
      : config.exposure === "BOOKMARKED"
        ? bookmarks.has(q.id)
        : config.exposure === "INCORRECT"
          ? incorrect.has(q.id)
          : true;
  });
  // Available years must reflect the same source, language, scope and exposure filters.
  const recentYears =
    config.yearPreset === "LAST10"
      ? new Set(
          [
            ...new Set(
              pool.flatMap((q) => (q.examYear === null ? [] : [q.examYear])),
            ),
          ]
            .sort((a, b) => b - a)
            .slice(0, 10),
        )
      : null;
  const yearPool = recentYears
    ? pool.filter((q) => q.examYear !== null && recentYears.has(q.examYear))
    : pool;
  const seenHashes = new Set<string>();
  const uniquePool = yearPool.filter((q) => {
    if (!q.contentHash) return true;
    if (seenHashes.has(q.contentHash)) return false;
    seenHashes.add(q.contentHash);
    return true;
  });
  return { syllabus, pool: uniquePool, selected };
}
export async function availability(userId: string, raw: unknown) {
  const config = testConfigSchema.parse(raw),
    { pool } = await preparePool(userId, config);
  const shortages: string[] = [];
  if (pool.length > 0 && config.difficultyMode !== "ANY") {
    const required = quotas(config.count, config.difficulty);
    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const available = pool.filter((question) => question.difficulty === difficulty).length;
      if (available < required[difficulty])
        shortages.push(`Difficulty ${difficulty.toLowerCase()}: need ${required[difficulty]}, available ${available}. Choose Any Difficulty or adjust the mix.`);
    }
  }
  if (config.kind === "FULL_MOCK") {
    const blueprint = await db.examBlueprint.findFirst({
      where: { active: true },
      orderBy: { version: "desc" },
      include: { sections: { include: { subject: true } } },
    });
    if (!blueprint) shortages.push("No active full mock blueprint");
    else
      for (const section of blueprint.sections) {
        const available = pool.filter(
          (q) => q.chapter.subjectId === section.subjectId,
        ).length;
        if (available < section.count)
          shortages.push(
            `${section.subject.name}: need ${section.count}, available ${available}`,
          );
      }
    if (blueprint && !shortages.length) {
      const settings = await db.platformSettings.findUnique({
        where: { key: "NEET_2027_PROVISIONAL" },
      });
      const policy = settings?.value as {
        physicsClassCounts?: Record<string, number>;
        chemistryCoverage?: Record<string, number>;
        biologyCoverage?: Record<string, number>;
      } | null;
      for (const [subject, coverage] of [
        ["Physics", policy?.physicsClassCounts],
        ["Chemistry", policy?.chemistryCoverage],
        ["Biology", policy?.biologyCoverage],
      ] as const) {
        if (!coverage) {
          shortages.push(`${subject} coverage policy is missing`);
          continue;
        }
        for (const [group, need] of Object.entries(coverage)) {
          const available = pool.filter((q) =>
            q.chapter.subject.name === subject &&
            (subject === "Physics"
              ? String(q.chapter.classLevel) === group
              : `${q.chapter.classLevel} | ${q.chapter.classification}` === group),
          ).length;
          if (available < need)
            shortages.push(`${subject} ${group}: need ${need}, available ${available}`);
        }
      }
    }
  }
  if (
    config.kind === "PHYSICS_SECTION" ||
    config.kind === "BIOLOGY_SECTION" ||
    config.kind === "CHEMISTRY_SECTION"
  ) {
    const settings = await db.platformSettings.findUnique({
      where: { key: "NEET_2027_PROVISIONAL" },
    });
    const policy = settings?.value as {
      physicsClassCounts?: Record<string, number>;
      biologyCoverage?: Record<string, number>;
      chemistryCoverage?: Record<string, number>;
    } | null;
    const coverage =
      config.kind === "PHYSICS_SECTION"
        ? policy?.physicsClassCounts
        : config.kind === "BIOLOGY_SECTION"
          ? policy?.biologyCoverage
          : policy?.chemistryCoverage;
    if (!coverage) shortages.push("Section coverage policy is missing");
    else
      for (const [group, need] of Object.entries(coverage)) {
        const available = pool.filter((q) =>
          config.kind === "PHYSICS_SECTION"
            ? String(q.chapter.classLevel) === group
            : `${q.chapter.classLevel} | ${q.chapter.classification}` === group,
        ).length;
        if (available < need)
          shortages.push(`${group}: need ${need}, available ${available}`);
      }
  }
  return {
    total: pool.length,
    shortages,
    difficulty: Object.fromEntries(
      ["EASY", "MEDIUM", "HARD"].map((d) => [
        d,
        pool.filter((q) => q.difficulty === d).length,
      ]),
    ),
    chapters: Object.fromEntries(
      [...new Set(pool.map((q) => q.chapterId))].map((id) => [
        id,
        pool.filter((q) => q.chapterId === id).length,
      ]),
    ),
  };
}
export async function generateTest(userId: string, raw: unknown) {
  const config = testConfigSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      const { syllabus, pool, selected } = await preparePool(
        userId,
        config,
        tx,
      );
      let count = config.count,
        duration = config.durationMinutes,
        mode = config.mode;
      let allocations =
        config.allocation === "MANUAL"
          ? config.chapterCounts
          : config.allocation === "MANUAL_SUBJECT"
            ? config.subjectCounts
            : undefined;
      let groupBy: "subjectId" | "chapterId" =
        config.allocation === "MANUAL_SUBJECT" ? "subjectId" : "chapterId";
      let marking = markingFor(mode);
      let fullBlueprintSections: { subjectId: string; count: number }[] | null =
        null;
      if (config.kind === "FULL_MOCK") {
        const blueprint = await tx.examBlueprint.findFirst({
          where: { active: true, syllabusId: syllabus.id },
          include: { sections: true },
          orderBy: { version: "desc" },
        });
        if (
          !blueprint ||
          blueprint.sections.reduce((a, s) => a + s.count, 0) !==
            blueprint.totalQuestions
        )
          throw new GenerationError("A valid exam blueprint is not configured");
        count = blueprint.totalQuestions;
        duration = blueprint.durationMinutes;
        mode = "NEET";
        marking = {
          correctMarks: blueprint.correctMarks,
          incorrectMarks: blueprint.incorrectMarks,
          unansweredMarks: blueprint.unansweredMarks,
        };
        allocations = Object.fromEntries(
          blueprint.sections.map((s) => [s.subjectId, s.count]),
        );
        groupBy = "subjectId";
        fullBlueprintSections = blueprint.sections.map((s) => ({
          subjectId: s.subjectId,
          count: s.count,
        }));
      }
      const seed = randomUUID();
      const candidates = pool.map((q) => ({
        id: q.id,
        chapterId: q.chapterId,
        subjectId: q.chapter.subjectId,
        difficulty: q.difficulty,
        topicIds: q.topics.filter((t) => !t.required).map((t) => t.topicId),
        prerequisiteIds: q.topics
          .filter((t) => t.required)
          .map((t) => t.topicId),
      }));
      if (fullBlueprintSections && candidates.length < count) {
        const detail = fullBlueprintSections.map((section) => {
          const name = syllabus.subjects.find((s) => s.id === section.subjectId)?.name ?? section.subjectId;
          return `${name}: ${candidates.filter((q) => q.subjectId === section.subjectId).length}/${section.count}`;
        });
        throw new GenerationError(
          `Insufficient approved questions for a full mock (${detail.join(", ")})`,
        );
      }
      if (fullBlueprintSections) {
        const row = await tx.platformSettings.findUniqueOrThrow({
          where: { key: "NEET_2027_PROVISIONAL" },
        });
        const policy = row.value as unknown as {
          physicsClassCounts: Record<string, number>;
          chemistryCoverage: Record<string, number>;
          biologyCoverage: Record<string, number>;
        };
        const subjectCounts = new Map(
          fullBlueprintSections.map((s) => [s.subjectId, s.count]),
        );
        const subject = (name: string) => {
          const id = syllabus.subjects.find((s) => s.name === name)?.id;
          if (!id || !subjectCounts.has(id))
            throw new GenerationError(`${name} is missing from the full mock blueprint`);
          return id;
        };
        const physicsId = subject("Physics"),
          chemistryId = subject("Chemistry"),
          biologyId = subject("Biology");
        const quotaTotal = (values: Record<string, number>) =>
          Object.values(values ?? {}).reduce((a, b) => a + b, 0);
        if (
          quotaTotal(policy.physicsClassCounts) !== subjectCounts.get(physicsId) ||
          quotaTotal(policy.chemistryCoverage) !== subjectCounts.get(chemistryId) ||
          quotaTotal(policy.biologyCoverage) !== subjectCounts.get(biologyId)
        )
          throw new GenerationError("Full mock coverage quotas do not match the blueprint");
        const subjectPool = (id: string) =>
          candidates.filter((q) => q.subjectId === id);
        const chapterClass = Object.fromEntries(
          pool.map((q) => [q.chapterId, q.chapter.classLevel]),
        );
        const chapterGroup = Object.fromEntries(
          pool.map((q) => [
            q.chapterId,
            `${q.chapter.classLevel} | ${q.chapter.classification}`,
          ]),
        );
        allocations = {
          ...physicsAllocations(
            subjectPool(physicsId),
            chapterClass,
            policy.physicsClassCounts,
            seed + "physics",
          ),
          ...coverageAllocations(
            subjectPool(chemistryId),
            chapterGroup,
            policy.chemistryCoverage,
            seed + "chemistry",
            undefined,
            "Chemistry",
          ),
          ...coverageAllocations(
            subjectPool(biologyId),
            chapterGroup,
            policy.biologyCoverage,
            seed + "biology",
            undefined,
            "Biology",
          ),
        };
        groupBy = "chapterId";
      }
      if (config.kind === "PHYSICS_SECTION") {
        groupBy = "chapterId";
        const row = await tx.platformSettings.findUniqueOrThrow({
          where: { key: "NEET_2027_PROVISIONAL" },
        });
        const policy = row.value as unknown as {
          sections: { Physics: number };
          physicsClassCounts: Record<string, number>;
          chapterWeights?: Record<string, number>;
          correct: number;
          incorrect: number;
          unanswered: number;
        };
        count = policy.sections.Physics;
        duration = 45;
        mode = "NEET";
        if (
          Object.values(policy.physicsClassCounts).reduce(
            (a, b) => a + b,
            0,
          ) !== count
        )
          throw new GenerationError("Invalid Physics blueprint class quotas");
        allocations = physicsAllocations(
          candidates,
          Object.fromEntries(
            pool.map((q) => [q.chapterId, q.chapter.classLevel]),
          ),
          policy.physicsClassCounts,
          seed,
          policy.chapterWeights,
        );
        marking = {
          correctMarks: policy.correct,
          incorrectMarks: policy.incorrect,
          unansweredMarks: policy.unanswered,
        };
      }
      if (config.kind === "CHEMISTRY_SECTION") {
        const row = await tx.platformSettings.findUniqueOrThrow({
          where: { key: "NEET_2027_PROVISIONAL" },
        });
        const policy = row.value as unknown as {
          sections: { Chemistry: number };
          chemistryCoverage: Record<string, number>;
          chemistryChapterWeights?: Record<string, number>;
          correct: number;
          incorrect: number;
          unanswered: number;
        };
        count = policy.sections.Chemistry;
        duration = 45;
        mode = "NEET";
        groupBy = "chapterId";
        if (
          !policy.chemistryCoverage ||
          Object.values(policy.chemistryCoverage).reduce((a, b) => a + b, 0) !==
            count
        )
          throw new GenerationError(
            "Invalid Chemistry blueprint coverage quotas",
          );
        allocations = coverageAllocations(
          candidates,
          Object.fromEntries(
            pool.map((q) => [
              q.chapterId,
              `${q.chapter.classLevel} | ${q.chapter.classification}`,
            ]),
          ),
          policy.chemistryCoverage,
          seed,
          policy.chemistryChapterWeights,
          "Chemistry",
        );
        marking = {
          correctMarks: policy.correct,
          incorrectMarks: policy.incorrect,
          unansweredMarks: policy.unanswered,
        };
      }
      if (config.kind === "BIOLOGY_SECTION") {
        const row = await tx.platformSettings.findUniqueOrThrow({
          where: { key: "NEET_2027_PROVISIONAL" },
        });
        const policy = row.value as unknown as {
          sections: { Biology: number };
          biologyCoverage: Record<string, number>;
          biologyChapterWeights?: Record<string, number>;
          correct: number;
          incorrect: number;
          unanswered: number;
        };
        count = policy.sections.Biology;
        duration = 90;
        mode = "NEET";
        groupBy = "chapterId";
        if (
          !policy.biologyCoverage ||
          Object.values(policy.biologyCoverage).reduce((a, b) => a + b, 0) !==
            count
        )
          throw new GenerationError("Invalid Biology blueprint coverage quotas");
        allocations = coverageAllocations(
          candidates,
          Object.fromEntries(
            pool.map((q) => [
              q.chapterId,
              `${q.chapter.classLevel} | ${q.chapter.classification}`,
            ]),
          ),
          policy.biologyCoverage,
          seed,
          policy.biologyChapterWeights,
          "Biology",
        );
        marking = {
          correctMarks: policy.correct,
          incorrectMarks: policy.incorrect,
          unansweredMarks: policy.unanswered,
        };
      }
      const chosen = selectQuestions(
        candidates,
        count,
        config.difficulty,
        seed,
        allocations,
        groupBy,
        config.difficultyMode,
      );
      const finalized = {
        ...config,
        count,
        mode,
        durationMinutes: duration,
        topicIds: [...selected],
      };
      const test = await tx.test.create({
        data: {
          name: config.name,
          kind: config.kind,
          syllabusId: syllabus.id,
          seed,
          configuration: {
            create: {
              request: finalized as Prisma.InputJsonValue,
              mode,
              durationSeconds: duration ? duration * 60 : null,
              ...marking,
              instantFeedback: false,
            },
          },
          questions: {
            create: chosen.map((c, position) => {
              const q = pool.find((q) => q.id === c.id)!;
              return {
                questionId: q.id,
                position,
                version: q.version,
                snapshot: snapshotQuestion(
                  q,
                ) as unknown as Prisma.InputJsonValue,
              };
            }),
          },
        },
      });
      const attempt = await tx.testAttempt.create({
        data: {
          userId,
          testId: test.id,
          deadline: duration ? new Date(Date.now() + duration * 60000) : null,
        },
      });
      await tx.questionExposure.createMany({
        data: chosen.map((c) => ({ userId, questionId: c.id })),
        skipDuplicates: true,
      });
      return { testId: test.id, attemptId: attempt.id };
    },
    { timeout: 20000 },
  );
}
export async function finalizeAttempt(
  attemptId: string,
  userId?: string,
  onlyExpired = false,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TestAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
      const attempt = await tx.testAttempt.findUnique({
        where: { id: attemptId },
        include: {
          test: {
            include: {
              configuration: true,
              questions: { orderBy: { position: "asc" } },
            },
          },
          responses: true,
        },
      });
      if (!attempt || (userId && attempt.userId !== userId))
        throw new AppError("Test attempt not found", 404);
      if (attempt.status === "SUBMITTED") return attempt;
      if (onlyExpired && !deadlineReached(attempt.deadline)) return attempt;
      const config = attempt.test.configuration!;
      const outcomes = attempt.test.questions.map((q) => {
        const s = asSnapshot(q.snapshot),
          r = attempt.responses.find((r) => r.testQuestionId === q.id);
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
      const result = analytics(outcomes, config);
      const now = new Date(),
        submittedAt =
          attempt.deadline && attempt.deadline < now ? attempt.deadline : now;
      await tx.testAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "SUBMITTED",
          submittedAt,
          score: result.score,
          maximum: result.maximum,
          correct: result.correct,
          incorrect: result.incorrect,
          unattempted: result.unattempted,
        },
      });
      await tx.testAnalyticsSnapshot.create({
        data: {
          attemptId: attempt.id,
          data: result as unknown as Prisma.InputJsonValue,
        },
      });
      for (const o of outcomes.filter(
        (o) =>
          o.selectedOption !== null && o.selectedOption !== o.correctOption,
      )) {
        await tx.mistakeRecord.create({
          data: {
            userId: attempt.userId,
            attemptId: attempt.id,
            testQuestionId: o.id,
          },
        });
      }
      const weakTopics = [
        ...new Set(
          outcomes
            .filter(
              (o) =>
                o.selectedOption !== null &&
                o.selectedOption !== o.correctOption,
            )
            .flatMap((o) => o.topics.map((t) => t.id)),
        ),
      ];
      for (const topicId of weakTopics)
        await tx.revisionTask.upsert({
          where: { userId_topicId: { userId: attempt.userId, topicId } },
          create: { userId: attempt.userId, topicId },
          update: { completedAt: null, step: 0, dueAt: new Date() },
        });
      return { ...attempt, status: "SUBMITTED" as const, score: result.score };
    },
    { timeout: 20000 },
  );
}
export async function ownedAttempt(testId: string, userId: string) {
  const attempt = await db.testAttempt.findUnique({
    where: { testId_userId: { testId, userId } },
    include: {
      test: {
        include: {
          configuration: true,
          questions: { orderBy: { position: "asc" } },
          challenge: true,
        },
      },
      responses: true,
    },
  });
  if (!attempt) throw new AppError("Test attempt not found", 404);
  if (attempt.status === "ACTIVE" && deadlineReached(attempt.deadline)) {
    await finalizeAttempt(attempt.id, userId, true);
    return ownedAttempt(testId, userId);
  }
  return attempt;
}
export async function studentAttempt(testId: string, userId: string) {
  const attempt = await ownedAttempt(testId, userId);
  const questions: SafeQuestion[] = attempt.test.questions.map((q) => {
    const s = asSnapshot(q.snapshot);
    return {
      id: s.id,
      text: s.text,
      ...(s.structuredContent ? {structuredContent:s.structuredContent} : {}),
      options: s.options,
      difficulty: s.difficulty,
      chapterId: s.chapterId,
      chapter: s.chapter,
      subjectId: s.subjectId,
      subject: s.subject,
      classLevel: s.classLevel,
      topics: s.topics,
      media: s.media,
      testQuestionId: q.id,
      position: q.position,
    };
  });
  return {
    id: attempt.id,
    testId,
    name: attempt.test.name,
    mode: attempt.test.configuration!.mode,
    status: attempt.status,
    deadline: attempt.deadline?.toISOString() ?? null,
    startedAt: attempt.startedAt.toISOString(),
    serverNow: new Date().toISOString(),
    instantFeedback: false,
    questions,
    responses: attempt.responses.map((r) => ({
      testQuestionId: r.testQuestionId,
      selectedOption: r.selectedOption,
      marked: r.marked,
      visited: r.visited,
      revision: r.revision,
    })),
  };
}
export async function expireAttempts() {
  const expired = await db.testAttempt.findMany({
    where: { status: "ACTIVE", deadline: { lte: new Date() } },
    select: { id: true },
    take: 100,
  });
  for (const a of expired) await finalizeAttempt(a.id, undefined, true);
  return expired.length;
}
