import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import {
  generateTest,
  studentAttempt,
  ownedAttempt,
  finalizeAttempt,
  availability,
  asSnapshot,
} from "../../src/lib/services/testing";
import { saveQuestion } from "../../src/lib/services/content";
import { rescoreQuestion } from "../../src/lib/services/rescore";
import type { TestConfig } from "../../src/lib/domain/validation";
if (
  process.env.TEST_DATABASE_READY !== "true" ||
  !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")
)
  throw new Error(
    "Run integration checks with npm run test:integration to use an isolated database",
  );
let userId: string, otherId: string;
const config: TestConfig = {
  name: "Integration partial-chapter test",
  kind: "CUSTOM",
  topicIds: ["demo-atom-0", "demo-atom-2"],
  fullChapterIds: ["demo-mole"],
  count: 10,
  mode: "NEET",
  durationMinutes: 10,
  difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
  exposure: "ALL",
  allocation: "AUTO",
  chapterCounts: {},
  language: "en",
  instantFeedback: false,
};
beforeAll(async () => {
  const tag = crypto.randomUUID();
  userId = (
    await db.user.create({
      data: {
        email: `integration-${tag}@example.test`,
        name: "Integration Learner",
      },
    })
  ).id;
  otherId = (
    await db.user.create({ data: { email: `other-${tag}@example.test` } })
  ).id;
});
afterAll(async () => {
  await db.$disconnect();
});
describe("real PostgreSQL assessment workflows", () => {
  it("generates only approved questions inside mixed full/partial selection", async () => {
    const created = await generateTest(userId, config),
      attempt = await ownedAttempt(created.testId, userId);
    expect(attempt.test.questions).toHaveLength(10);
    for (const q of attempt.test.questions) {
      const s = asSnapshot(q.snapshot);
      expect(
        s.topics.every(
          (t) =>
            t.id.startsWith("demo-mole-") ||
            ["demo-atom-0", "demo-atom-2"].includes(t.id),
        ),
      ).toBe(true);
      expect(
        s.prerequisites.every(
          (id) =>
            id.startsWith("demo-mole-") ||
            ["demo-atom-0", "demo-atom-2"].includes(id),
        ),
      ).toBe(true);
    }
  });
  it("strips answer keys and explanations from active test payloads", async () => {
    const { testId } = await generateTest(userId, config),
      safe = await studentAttempt(testId, userId);
    expect(safe.questions[0]).not.toHaveProperty("correctOption");
    expect(safe.questions[0]).not.toHaveProperty("explanation");
  });
  it("isolates student attempts by account", async () => {
    const { testId } = await generateTest(userId, config);
    await expect(studentAttempt(testId, otherId)).rejects.toThrow("not found");
  });
  it("respects exact chapter counts", async () => {
    const { testId } = await generateTest(userId, {
        ...config,
        allocation: "MANUAL",
        chapterCounts: { "demo-mole": 6, "demo-atom": 4 },
      }),
      attempt = await ownedAttempt(testId, userId);
    expect(
      attempt.test.questions.filter(
        (q) => asSnapshot(q.snapshot).chapterId === "demo-mole",
      ),
    ).toHaveLength(6);
  });
  it("persists responses across retrieval and scores exactly once under concurrent submission", async () => {
    const { testId, attemptId } = await generateTest(userId, config),
      attempt = await ownedAttempt(testId, userId);
    for (const [i, q] of attempt.test.questions.entries()) {
      if (i > 1) break;
      const s = asSnapshot(q.snapshot);
      await db.questionResponse.create({
        data: {
          attemptId,
          testQuestionId: q.id,
          selectedOption: i === 0 ? s.correctOption : (s.correctOption + 1) % 4,
          revision: 1,
          visited: true,
        },
      });
    }
    expect((await studentAttempt(testId, userId)).responses).toHaveLength(2);
    await Promise.all([
      finalizeAttempt(attemptId, userId),
      finalizeAttempt(attemptId, userId),
    ]);
    const result = await db.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    expect(result).toMatchObject({
      score: 3,
      correct: 1,
      incorrect: 1,
      unattempted: 8,
      status: "SUBMITTED",
    });
    expect(await db.testAnalyticsSnapshot.count({ where: { attemptId } })).toBe(
      1,
    );
    expect(await db.mistakeRecord.count({ where: { attemptId } })).toBe(1);
    expect(await db.revisionTask.count({ where: { userId } })).toBeGreaterThan(
      0,
    );
  });
  it("honors the persisted deadline after refresh", async () => {
    const { testId, attemptId } = await generateTest(userId, config);
    await db.testAttempt.update({
      where: { id: attemptId },
      data: { deadline: new Date(Date.now() - 1000) },
    });
    const safe = await studentAttempt(testId, userId);
    expect(safe.status).toBe("SUBMITTED");
    expect(
      (await db.testAttempt.findUniqueOrThrow({ where: { id: attemptId } }))
        .score,
    ).toBe(0);
  });
  it("fails impossible full mocks instead of padding the bank", async () =>
    await expect(
      generateTest(userId, {
        ...config,
        kind: "FULL_MOCK",
        count: 180,
        durationMinutes: 180,
      }),
    ).rejects.toThrow(/Insufficient/));
  it("filters unseen exposure without silently repeating", async () => {
    const before = await availability(otherId, config);
    const { testId } = await generateTest(otherId, config);
    const after = await availability(otherId, {
      ...config,
      exposure: "UNSEEN",
    });
    expect(after.total).toBe(before.total - 10);
    expect((await studentAttempt(testId, otherId)).questions).toHaveLength(10);
  });
  it("preserves snapshot answers after content is edited and requires reapproval", async () => {
    const raw = {
      text: "An original integration question: which number is equal to two?",
      options: ["2", "3", "4", "5"],
      correctOption: 0,
      explanation: "The integer two is written as 2 in decimal notation.",
      chapterId: "demo-mole",
      topicIds: ["demo-mole-0"],
      prerequisiteIds: [],
      difficulty: "EASY",
      language: "en",
      source: "Integration fixture",
      license: "ORIGINAL",
      tags: ["fixture"],
      media: [],
    };
    const q = await db.$transaction((tx) =>
      saveQuestion(raw, { id: userId, role: "ADMIN" }, undefined, tx),
    );
    await db.question.update({
      where: { id: q.id },
      data: { status: "APPROVED" },
    });
    const edited = await db.$transaction((tx) =>
      saveQuestion(
        { ...raw, correctOption: 1 },
        { id: userId, role: "ADMIN" },
        q.id,
        tx,
      ),
    );
    expect(edited.status).toBe("DRAFT");
    expect(edited.version).toBe(2);
    expect(
      await db.questionVersion.count({ where: { questionId: q.id } }),
    ).toBe(2);
  });
  it("audits explicit historical corrections and recalculates real scores", async () => {
    const question = await db.question.findFirstOrThrow({
      where: { authorId: userId },
      include: {
        options: true,
        topics: { include: { topic: true } },
        media: true,
        chapter: { include: { subject: true } },
      },
    });
    const { snapshotQuestion } = await import("../../src/lib/services/testing");
    const snapshot = snapshotQuestion(question);
    const test = await db.test.create({
      data: {
        name: "Rescore fixture",
        kind: "CUSTOM",
        syllabusId: "demo-syllabus-2026",
        seed: "rescore",
        configuration: {
          create: {
            request: {},
            mode: "NEET",
            correctMarks: 4,
            incorrectMarks: -1,
          },
        },
        questions: {
          create: {
            questionId: question.id,
            position: 0,
            version: question.version,
            snapshot: JSON.parse(JSON.stringify(snapshot)),
          },
        },
      },
      include: { questions: true },
    });
    const attempt = await db.testAttempt.create({
        data: { testId: test.id, userId },
      }),
      selected = (snapshot.correctOption + 1) % 4;
    await db.questionResponse.create({
      data: {
        attemptId: attempt.id,
        testQuestionId: test.questions[0].id,
        selectedOption: selected,
        revision: 1,
      },
    });
    await finalizeAttempt(attempt.id, userId);
    expect(
      (await db.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } }))
        .score,
    ).toBe(-1);
    await rescoreQuestion(
      {
        questionId: question.id,
        version: question.version,
        correctOption: selected,
        reason:
          "A verified fixture answer-key defect is being corrected explicitly.",
      },
      userId,
    );
    expect(
      (await db.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } }))
        .score,
    ).toBe(4);
    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "EXPLICIT_HISTORICAL_RESCORE", entityId: question.id },
    });
    expect(audit.metadata).toHaveProperty("previousSnapshots");
    expect(
      asSnapshot(
        (
          await db.testQuestion.findUniqueOrThrow({
            where: { id: test.questions[0].id },
          })
        ).snapshot,
      ).correction?.reason,
    ).toContain("verified");
  });
});
