import { beforeAll, afterAll, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import {
  generateTest,
  ownedAttempt,
  studentAttempt,
  asSnapshot,
  availability,
  preparePool,
  finalizeAttempt,
} from "../../src/lib/services/testing";
import { testConfigSchema } from "../../src/lib/domain/validation";
import { expandTopicSelection } from "../../src/lib/domain/selection";

if (
  process.env.TEST_DATABASE_READY !== "true" ||
  !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")
)
  throw Error("Isolated DB required");

const physicsCoverage = { "11": 22, "12": 23 };
const chemistryCoverage = {
  "11 | Physical Chemistry": 8,
  "11 | Inorganic Chemistry": 8,
  "11 | Organic Chemistry": 6,
  "12 | Physical Chemistry": 7,
  "12 | Inorganic Chemistry": 7,
  "12 | Organic Chemistry": 9,
};
const biologyCoverage = {
  "11 | Botany": 19,
  "11 | Zoology": 19,
  "11 | Mixed": 7,
  "12 | Botany": 10,
  "12 | Zoology": 11,
  "12 | Mixed": 24,
};
const groups = [
  ["Physics", 11, "", 22],
  ["Physics", 12, "", 23],
  ...Object.entries(chemistryCoverage).map(([group, count]) => {
    const [level, category] = group.split(" | ");
    return ["Chemistry", Number(level), category, count];
  }),
  ...Object.entries(biologyCoverage).map(([group, count]) => {
    const [level, category] = group.split(" | ");
    return ["Biology", Number(level), category, count];
  }),
] as [string, number, string, number][];

let sourceId: string, userId: string, n = 0;
const subjectIds: Record<string, string> = {};
const ids: Record<string, string> = {};
const chapterId = (subject: string, level: number, category: string) =>
  `biology-test-${subject.toLowerCase()}-${level}-${category.toLowerCase().replaceAll(" ", "-") || "core"}`;
const config = testConfigSchema.parse({
  name: "Isolated Biology assessment",
  kind: "CUSTOM",
  topicIds: [],
  fullChapterIds: [],
  count: 10,
  mode: "NEET",
  durationMinutes: 30,
  difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
  exposure: "ALL",
  allocation: "AUTO",
  chapterCounts: {},
  sourceFilter: "PYQ",
});

async function fixture(
  chapter: string,
  topic: string,
  extra: { rights?: string; answer?: string; sourceOut?: boolean } = {},
) {
  const id = crypto.randomUUID();
  n++;
  await db.question.create({
    data: {
      id,
      chapterId: chapter,
      text: `Isolated independently authored Biology integration fixture ${n}`,
      explanation: "Test-only independently authored fixture.",
      correctOption: 1,
      difficulty: "EASY",
      status: "APPROVED",
      license: "LICENSED",
      tags: ["PYQ"],
      examYear: 2025,
      contentHash: id,
      options: {
        create: ["A", "B", "C", "D"].map((text, position) => ({ text, position })),
      },
      topics: { create: { topicId: topic, required: false } },
      importRecord: {
        create: {
          id,
          sourceId,
          sourceNumber: n,
          year: 2025,
          exam: "ISOLATED FIXTURE",
          page: 1,
          type: "SINGLE_CORRECT",
          sourceOut: extra.sourceOut ?? false,
          contentHash: id,
          extracted: { answer: "B" },
          suggestions: {},
          reviewStatus: "APPROVED",
          answerStatus: extra.answer ?? "VERIFIED",
          rightsStatus: extra.rights ?? "CLEARED",
          eligibility: "ELIGIBLE",
          rightsEvidence: "Isolated test fixture.",
          reviewEvidence: "Isolated test fixture.",
        },
      },
    },
  });
  return id;
}

beforeAll(async () => {
  userId = (await db.user.create({ data: { email: `bio-${crypto.randomUUID()}@example.test` } })).id;
  for (const name of ["Physics", "Chemistry", "Biology"])
    subjectIds[name] = (await db.subject.findFirstOrThrow({ where: { name, syllabus: { active: true } } })).id;
  sourceId = crypto.randomUUID();
  await db.sourceDocument.create({
    data: {
      id: sourceId,
      fileName: "isolated-biology-fixtures.pdf",
      title: "Isolated test fixtures",
      sha256: sourceId,
      pageCount: 1,
      declaredCount: 200,
      rightsStatus: "CLEARED",
      metadata: { subject: "Biology", permissionDecision: { authorizedScope: "STUDENT_TESTS" } },
    },
  });
  for (const [subject, level, category, count] of groups) {
    const id = chapterId(subject, level, category);
    ids[`${subject} | ${level} | ${category}`] = id;
    await db.chapter.create({
      data: {
        id,
        name: `${subject} ${level} ${category}`,
        slug: id,
        classLevel: level,
        classification: category || null,
        subjectId: subjectIds[subject],
        topics: { create: [1, 2].map((i) => ({ id: `${id}-t${i}`, name: `Concept ${i}`, slug: `${id}-t${i}` })) },
      },
    });
    for (let i = 0; i < count; i++) await fixture(id, `${id}-t1`);
  }
  const mixed = ids["Biology | 11 | Mixed"];
  await fixture(mixed, `${mixed}-t2`);
  await fixture(mixed, `${mixed}-t1`, { rights: "UNVERIFIED" });
  await fixture(mixed, `${mixed}-t1`, { answer: "REVIEW_REQUIRED" });
  await fixture(mixed, `${mixed}-t1`, { sourceOut: true });
  const settings = await db.platformSettings.findUnique({ where: { key: "NEET_2027_PROVISIONAL" } });
  const value = {
        ...((settings?.value as object | undefined) ?? {}),
        sections: { Physics: 45, Chemistry: 45, Biology: 90 },
        correct: 4,
        incorrect: -1,
        unanswered: 0,
        physicsClassCounts: physicsCoverage,
        chemistryCoverage,
        biologyCoverage,
      };
  await db.platformSettings.upsert({
    where: { key: "NEET_2027_PROVISIONAL" },
    create: { key: "NEET_2027_PROVISIONAL", value },
    update: { value },
  });
}, 120000);

afterAll(async () => {
  if (sourceId)
    await db.question.updateMany({
      where: { importRecord: { is: { sourceId } } },
      data: { active: false, status: "ARCHIVED" },
    });
  await db.$disconnect();
});

it("keeps Biology chapter and topic selection exact and excludes uncleared imports", async () => {
  const botany = ids["Biology | 11 | Botany"];
  const mixed = ids["Biology | 11 | Mixed"];
  const request = {
    ...config,
    topicIds: [`${mixed}-t2`],
    fullChapterIds: [botany],
  };
  const { selected, pool } = await preparePool(userId, request);
  expect([...selected].sort()).toEqual(
    expandTopicSelection([`${botany}-t1`, `${botany}-t2`, `${mixed}-t2`], [
      { id: `${botany}-t1`, parentId: null },
      { id: `${botany}-t2`, parentId: null },
      { id: `${mixed}-t2`, parentId: null },
    ]).sort(),
  );
  expect(pool.every((q) => q.chapterId === botany || q.topics.some((t) => t.topicId === `${mixed}-t2`))).toBe(true);
  const { testId } = await generateTest(userId, request);
  const attempt = await ownedAttempt(testId, userId);
  expect(attempt.test.questions).toHaveLength(10);
  expect(attempt.test.questions.every((q) => asSnapshot(q.snapshot).subject === "Biology")).toBe(true);
});

it("persists an exact Physics, Chemistry and Biology custom allocation", async () => {
  const { testId } = await generateTest(userId, {
    ...config,
    fullChapterIds: [
      ids["Physics | 11 | "],
      ids["Chemistry | 11 | Physical Chemistry"],
      ids["Biology | 11 | Botany"],
    ],
    count: 10,
    allocation: "MANUAL_SUBJECT",
    subjectCounts: {
      [subjectIds.Physics]: 4,
      [subjectIds.Chemistry]: 3,
      [subjectIds.Biology]: 3,
    },
  });
  const attempt = await ownedAttempt(testId, userId);
  const counts = Object.groupBy(attempt.test.questions.map((q) => asSnapshot(q.snapshot).subject), (x) => x);
  expect(counts.Physics).toHaveLength(4);
  expect(counts.Chemistry).toHaveLength(3);
  expect(counts.Biology).toHaveLength(3);
  const safe = await studentAttempt(testId, userId);
  expect(safe.questions.every((q) => !("correctOption" in q) && !("explanation" in q))).toBe(true);
});

it("generates a guarded 90-question Biology section with provisional coverage", async () => {
  const request = { ...config, kind: "BIOLOGY_SECTION", count: 90, durationMinutes: 90 };
  expect((await availability(userId, request)).shortages).toEqual([]);
  const { testId } = await generateTest(userId, request);
  const attempt = await ownedAttempt(testId, userId);
  const snapshots = attempt.test.questions.map((q) => asSnapshot(q.snapshot));
  expect(snapshots).toHaveLength(90);
  expect(new Set(snapshots.map((q) => q.id)).size).toBe(90);
  const counts: Record<string, number> = {};
  for (const q of snapshots) {
    expect(q.subject).toBe("Biology");
    const c = groups.find(([s, l, cat]) => s === "Biology" && chapterId(s, l, cat) === q.chapterId)!;
    const key = `${c[1]} | ${c[2]}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  expect(counts).toEqual(biologyCoverage);
}, 60000);

it("generates a 180-minute, 180-question full mock and scores only on the server", async () => {
  const request = { ...config, kind: "FULL_MOCK", count: 180, durationMinutes: 180 };
  expect((await availability(userId, request)).shortages).toEqual([]);
  const { testId, attemptId } = await generateTest(userId, request);
  const attempt = await ownedAttempt(testId, userId);
  const snapshots = attempt.test.questions.map((q) => asSnapshot(q.snapshot));
  expect(snapshots).toHaveLength(180);
  expect(new Set(snapshots.map((q) => q.id)).size).toBe(180);
  const counts = Object.groupBy(snapshots.map((q) => q.subject), (x) => x);
  expect(counts.Physics).toHaveLength(45);
  expect(counts.Chemistry).toHaveLength(45);
  expect(counts.Biology).toHaveLength(90);
  expect(attempt.test.configuration?.durationSeconds).toBe(10800);
  const safe = await studentAttempt(testId, userId);
  expect(safe.questions.every((q) => !("correctOption" in q) && !("explanation" in q))).toBe(true);
  await db.questionResponse.createMany({
    data: [
      { attemptId, testQuestionId: attempt.test.questions[0].id, selectedOption: 1, revision: 1 },
      { attemptId, testQuestionId: attempt.test.questions[1].id, selectedOption: 0, revision: 1 },
    ],
  });
  await finalizeAttempt(attemptId, userId);
  expect(await db.testAttempt.findUnique({ where: { id: attemptId } })).toMatchObject({
    status: "SUBMITTED", score: 3, maximum: 720, correct: 1, incorrect: 1, unattempted: 178,
  });
}, 60000);
