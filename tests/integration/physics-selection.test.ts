import { beforeAll, afterAll, it, expect } from "vitest";
import chapters from "../fixtures/physics-selection-syllabus.json";
import { db } from "../../src/lib/db";
import {
  generateTest,
  availability,
  preparePool,
  ownedAttempt,
  asSnapshot,
  studentAttempt,
} from "../../src/lib/services/testing";
import {
  eligibleBankWhere,
  invalidateImportApproval,
} from "../../src/lib/services/publication";
import { testConfigSchema } from "../../src/lib/domain/validation";
if (
  process.env.TEST_DATABASE_READY !== "true" ||
  !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")
)
  throw Error("Isolated database required");
const units = "physics-school-11-1",
  motion = "physics-school-11-2",
  current = "physics-school-12-3";
const selectedMotion = [motion + "-t6", motion + "-t7"];
const config = testConfigSchema.parse({
  name: "Isolated exact Physics selection",
  kind: "CUSTOM",
  topicIds: selectedMotion,
  fullChapterIds: [units, current],
  count: 22,
  mode: "NEET",
  durationMinutes: 22,
  difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
  exposure: "ALL",
  allocation: "AUTO",
  chapterCounts: {},
  sourceFilter: "PYQ",
  yearPreset: "ALL",
});
const approved = {
  reviewStatus: "APPROVED",
  answerStatus: "VERIFIED",
  rightsStatus: "CLEARED",
  eligibility: "ELIGIBLE",
  eligibilityVersion: "NEET-2027-PROVISIONAL",
  type: "SINGLE_CORRECT",
  sourceOut: false,
};
let userId: string,
  sourceId: string,
  serial = 0;
const allowed = new Set([
  ...chapters
    .filter((c) => c.id !== motion)
    .flatMap((c) => c.topics.map((t) => t.id)),
  ...selectedMotion,
]);
const validIds: string[] = [];
async function fixture(
  chapterId: string,
  topicId: string,
  extra: {
    prerequisite?: string;
    primary?: string;
    approved?: boolean;
    year?: number;
    pyq?: boolean;
    language?: string;
    hash?: string;
  } = {},
) {
  const id = crypto.randomUUID(),
    n = ++serial;
  await db.question.create({
    data: {
      id,
      chapterId,
      text: "Isolated test fixture " + n,
      explanation: "Synthetic test-only answer explanation.",
      correctOption: 0,
      difficulty: "EASY",
      status: "APPROVED",
      active: true,
      license: "LICENSED",
      tags: extra.pyq === false ? [] : ["PYQ"],
      language: extra.language ?? "en",
      examYear: extra.year ?? 1990,
      contentHash: extra.hash ?? id,
      options: {
        create: ["A", "B", "C", "D"].map((text, position) => ({
          text,
          position,
        })),
      },
      topics: {
        create: [
          { topicId, required: false },
          ...(extra.primary
            ? [{ topicId: extra.primary, required: false }]
            : []),
          ...(extra.prerequisite
            ? [{ topicId: extra.prerequisite, required: true }]
            : []),
        ],
      },
      importRecord: {
        create: {
          id,
          sourceId,
          sourceNumber: n,
          year: extra.year ?? 1990,
          exam: "ISOLATED FIXTURE",
          page: 1,
          contentHash: id,
          extracted: { answer: "A" },
          suggestions: {},
          ...approved,
          ...(extra.approved === false ? { rightsStatus: "UNVERIFIED" } : {}),
          rightsEvidence: "Synthetic fixture only; no production publication.",
          reviewEvidence: "Synthetic fixture academic validation.",
        },
      },
    },
  });
  return id;
}
beforeAll(async () => {
  userId = (
    await db.user.create({
      data: { email: `physics-audit-${crypto.randomUUID()}@example.test` },
    })
  ).id;
  const subject = await db.subject.findFirstOrThrow({
    where: { name: "Physics", syllabus: { active: true } },
  });
  for (const c of chapters)
    await db.chapter.create({
      data: {
        id: c.id,
        name: c.name,
        slug: c.id,
        classLevel: c.classLevel,
        subjectId: subject.id,
        topics: {
          create: c.topics.map((t) => ({ ...t, eligibility: "ELIGIBLE" })),
        },
      },
    });
  sourceId = crypto.randomUUID();
  await db.sourceDocument.create({
    data: {
      id: sourceId,
      fileName: "isolated-fixture.pdf",
      title: "Isolated audit fixture",
      sha256: sourceId,
      pageCount: 1,
      declaredCount: 100,
      rightsStatus: "CLEARED",
      metadata: { permissionDecision: { authorizedScope: "STUDENT_TESTS" } },
    },
  });
  // Exactly one approved question for each of the 22 selected topic IDs.
  for (const c of chapters)
    for (const t of c.topics)
      if (allowed.has(t.id)) validIds.push(await fixture(c.id, t.id));
  await fixture(motion, motion + "-t1");
  await fixture(motion, selectedMotion[0], { primary: motion + "-t1" });
  await fixture(current, current + "-t1", { prerequisite: motion + "-t1" });
  await fixture(units, units + "-t1", { approved: false });
  await fixture(units, units + "-t1", { language: "hi" });
  // Newer non-PYQ records must not displace the older PYQ year window.
  for (let year = 2010; year < 2020; year++)
    await fixture(units, units + "-t1", { year, pyq: false });
});
afterAll(async () => {
  if (sourceId)
    await db.question.updateMany({
      where: { importRecord: { is: { sourceId } } },
      data: { active: false, status: "ARCHIVED" },
    });
  await db.$disconnect();
});
it("resolves the exact 22 requested topics and rejects out-of-scope primary/prerequisite topics", async () => {
  const result = await preparePool(userId, config);
  expect([...result.selected].sort()).toEqual([...allowed].sort());
  expect(result.pool.map((q) => q.id).sort()).toEqual([...validIds].sort());
});
it("generates a persisted mixed-class test containing exactly the selected topics, without answer leakage", async () => {
  const { testId } = await generateTest(userId, config),
    attempt = await ownedAttempt(testId, userId);
  expect(attempt.test.questions).toHaveLength(22);
  const represented = new Set<string>();
  for (const row of attempt.test.questions) {
    const q = asSnapshot(row.snapshot);
    expect(validIds).toContain(q.id);
    for (const t of q.topics) {
      expect(allowed.has(t.id)).toBe(true);
      represented.add(t.id);
    }
    expect(q.prerequisites.every((t) => allowed.has(t))).toBe(true);
  }
  expect([...represented].sort()).toEqual([...allowed].sort());
  const safe = await studentAttempt(testId, userId);
  for (const q of safe.questions) {
    expect(q).not.toHaveProperty("correctOption");
    expect(q).not.toHaveProperty("explanation");
  }
});
it("calculates last ten available years from the actual eligible PYQ pool", async () => {
  const result = await preparePool(userId, { ...config, yearPreset: "LAST10" });
  expect(result.pool.map((q) => q.id).sort()).toEqual([...validIds].sort());
});
it("withdraws stale review approvals without changing frozen student snapshots", async () => {
  const { testId } = await generateTest(userId, config),
    before = await ownedAttempt(testId, userId);
  const id = validIds[0];
  await db.$transaction((tx) => invalidateImportApproval(tx, id));
  expect(
    await db.question.count({ where: { AND: [eligibleBankWhere, { id }] } }),
  ).toBe(0);
  expect(await db.sourceQuestion.findUnique({ where: { id } })).toMatchObject({
    reviewStatus: "PENDING",
    answerStatus: "SOURCE_MATCHED",
    rightsStatus: "UNVERIFIED",
  });
  const after = await ownedAttempt(testId, userId);
  expect(after.test.questions).toEqual(before.test.questions);
  // Restore this fixture for subsequent isolated blueprint checks only.
  await db.$transaction([
    db.sourceQuestion.update({ where: { id }, data: approved }),
    db.question.update({
      where: { id },
      data: { active: true, status: "APPROVED" },
    }),
  ]);
});
it("generates a 45-question section with 22 Class 11 and 23 Class 12 under the provisional policy", async () => {
  const policy = {
    status: "PROVISIONAL",
    sections: { Physics: 45 },
    physicsClassCounts: { "11": 22, "12": 23 },
    correct: 4,
    incorrect: -1,
    unanswered: 0,
  };
  await db.platformSettings.upsert({
    where: { key: "NEET_2027_PROVISIONAL" },
    create: { key: "NEET_2027_PROVISIONAL", value: policy },
    update: { value: policy },
  });
  const scarce = await availability(userId, {
    ...config,
    kind: "PHYSICS_SECTION",
    topicIds: [],
    fullChapterIds: [],
    count: 45,
    durationMinutes: 45,
  });
  expect(scarce.total).toBeLessThan(45);
  expect(scarce.shortages).toContainEqual(
    expect.stringContaining("need 23, available"),
  );
  for (let i = 0; i < 30; i++) {
    await fixture(units, units + "-t1");
    await fixture(current, current + "-t1");
  }
  const ready = await availability(userId, {
    ...config,
    kind: "PHYSICS_SECTION",
    topicIds: [],
    fullChapterIds: [],
    count: 45,
    durationMinutes: 45,
  });
  expect(ready.shortages).toEqual([]);
  const { testId } = await generateTest(userId, {
    ...config,
    kind: "PHYSICS_SECTION",
    topicIds: [],
    fullChapterIds: [],
    count: 45,
    durationMinutes: 45,
  });
  const attempt = await ownedAttempt(testId, userId),
    snapshots = attempt.test.questions.map((q) => asSnapshot(q.snapshot));
  expect(snapshots).toHaveLength(45);
  expect(new Set(snapshots.map((q) => q.id)).size).toBe(45);
  expect(snapshots.filter((q) => q.classLevel === 11)).toHaveLength(22);
  expect(snapshots.filter((q) => q.classLevel === 12)).toHaveLength(23);
  expect(snapshots.every((q) => q.subject === "Physics")).toBe(true);
  expect(attempt.test.configuration).toMatchObject({
    durationSeconds: 2700,
    correctMarks: 4,
    incorrectMarks: -1,
  });
});
