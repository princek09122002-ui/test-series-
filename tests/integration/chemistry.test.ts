import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { db } from "../../src/lib/db";
import syllabus from "../fixtures/chemistry-syllabus.json";
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
const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("../../src/lib/auth", () => ({
  requireUser: async () => ({ id: auth.id, role: "STUDENT" }),
}));
import { POST as legacyPyq } from "../../src/app/api/pyq/route";
if (
  process.env.TEST_DATABASE_READY !== "true" ||
  !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")
)
  throw Error("Isolated DB required");
let userId: string,
  chemistryId: string,
  physicsId: string,
  sourceId: string,
  n = 0;
const mole = "chemistry-school-11-1",
  atom = "chemistry-school-11-2",
  electro = "chemistry-school-12-2",
  phys = "chem-audit-physics-units";
const config = testConfigSchema.parse({
  name: "Chemistry exact custom test",
  kind: "CUSTOM",
  topicIds: [atom + "-t2", atom + "-t4"],
  fullChapterIds: [mole, electro],
  count: 20,
  mode: "NEET",
  durationMinutes: 20,
  difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
  exposure: "ALL",
  allocation: "AUTO",
  chapterCounts: {},
  sourceFilter: "PYQ",
});
const policy = {
  "11 | Physical Chemistry": 8,
  "11 | Inorganic Chemistry": 8,
  "11 | Organic Chemistry": 6,
  "12 | Physical Chemistry": 7,
  "12 | Inorganic Chemistry": 7,
  "12 | Organic Chemistry": 9,
};
const excluded: string[] = [];
async function fixture(
  chapterId: string,
  topicId: string,
  extra: {
    prerequisite?: string;
    rights?: string;
    type?: string;
    eligibility?: string;
    hash?: string;
  } = {},
) {
  const id = crypto.randomUUID();
  await db.question.create({
    data: {
      id,
      chapterId,
      text: "Isolated Chemistry fixture " + ++n,
      explanation: "Test-only independently authored fixture.",
      correctOption: 1,
      difficulty: "EASY",
      status: "APPROVED",
      license: "LICENSED",
      tags: ["PYQ"],
      examYear: 2025,
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
          year: 2025,
          exam: "ISOLATED FIXTURE",
          page: 1,
          type: extra.type ?? "SINGLE_CORRECT",
          sourceOut: false,
          contentHash: id,
          extracted: { answer: "B" },
          suggestions: {},
          reviewStatus: "APPROVED",
          answerStatus: "VERIFIED",
          rightsStatus: extra.rights ?? "CLEARED",
          eligibility: extra.eligibility ?? "ELIGIBLE",
          rightsEvidence: "Test-only fixture rights evidence.",
          reviewEvidence: "Test-only academic fixture evidence.",
        },
      },
    },
  });
  return id;
}
beforeAll(async () => {
  userId = (
    await db.user.create({
      data: { email: `chem-${crypto.randomUUID()}@example.test` },
    })
  ).id;
  auth.id = userId;
  const chem = await db.subject.findFirstOrThrow({
      where: { name: "Chemistry", syllabus: { active: true } },
    }),
    physics = await db.subject.findFirstOrThrow({
      where: { name: "Physics", syllabus: { active: true } },
    });
  chemistryId = chem.id;
  physicsId = physics.id;
  for (const c of syllabus) {
    await db.chapter.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        slug: c.id,
        classLevel: c.classLevel,
        classification: c.category,
        subjectId: chem.id,
      },
      update: {},
    });
    for (const [i, t] of c.topics.entries())
      await db.topic.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          name: t.name,
          slug: t.id,
          chapterId: c.id,
          parentId: t.parentId,
          order: i,
        },
        update: {},
      });
  }
  await db.chapter.upsert({
    where: { id: phys },
    create: {
      id: phys,
      name: "Units And Measurements",
      slug: phys,
      classLevel: 11,
      subjectId: physics.id,
      topics: { create: { id: phys + "-t1", name: "Units", slug: "units" } },
    },
    update: {},
  });
  sourceId = crypto.randomUUID();
  await db.sourceDocument.create({
    data: {
      id: sourceId,
      fileName: "isolated-chemistry-fixtures.pdf",
      title: "Synthetic Chemistry fixtures",
      sha256: sourceId,
      pageCount: 1,
      declaredCount: 150,
      rightsStatus: "CLEARED",
      metadata: { subject: "Chemistry", permissionDecision: { authorizedScope: "STUDENT_TESTS" } },
    },
  });
  for (const chapter of [
    mole,
    "chemistry-school-11-3",
    "chemistry-school-11-9",
    electro,
    "chemistry-school-12-5",
    "chemistry-school-12-9",
    phys,
  ])
    for (let i = 0; i < 18; i++) await fixture(chapter, chapter + "-t1");
  await fixture(atom, atom + "-t2-s1");
  await fixture(atom, atom + "-t4-s1");
  excluded.push(
    await fixture(atom, atom + "-t6"),
    await fixture(electro, electro + "-t1", { prerequisite: atom + "-t6" }),
    await fixture(mole, mole + "-t1", { rights: "UNVERIFIED" }),
    await fixture(mole, mole + "-t1", { type: "MULTIPLE_CORRECT" }),
    await fixture(mole, mole + "-t1", { eligibility: "OUT_OF_SYLLABUS" }),
  );
});
afterAll(async () => {
  if (sourceId)
    await db.question.updateMany({
      where: { importRecord: { is: { sourceId } } },
      data: { active: false, status: "ARCHIVED" },
    });
  await db.$disconnect();
});
it("keeps all core, formative and practical syllabus sections with zero-question topics", async () => {
  expect(
    await db.chapter.count({
      where: { id: { startsWith: "chemistry-school-" } },
    }),
  ).toBe(29);
  expect(
    await db.topic.count({
      where: { chapterId: { startsWith: "chemistry-school-" } },
    }),
  ).toBe(281);
  expect(
    await db.topic.count({
      where: {
        chapterId: { startsWith: "chemistry-school-" },
        questions: { none: {} },
      },
    }),
  ).toBeGreaterThan(200);
});
it("resolves exact mixed Class 11/12 Chemistry scope including only selected topic descendants", async () => {
  const { selected, pool } = await preparePool(userId, config);
  const expected = expandTopicSelection(
    [
      ...config.topicIds,
      ...syllabus
        .filter((c) => config.fullChapterIds.includes(c.id))
        .flatMap((c) => c.topics.map((t) => t.id)),
    ],
    syllabus.flatMap((c) => c.topics),
  );
  expect([...selected].sort()).toEqual([...new Set(expected)].sort());
  expect(pool.every((q) => !excluded.includes(q.id))).toBe(true);
  expect((await availability(userId, config)).total).toBe(pool.length);
  const { testId } = await generateTest(userId, config),
    attempt = await ownedAttempt(testId, userId);
  for (const row of attempt.test.questions) {
    const q = asSnapshot(row.snapshot);
    expect(q.subject).toBe("Chemistry");
    expect(q.topics.every((t) => selected.has(t.id))).toBe(true);
    expect(q.prerequisites.every((id) => selected.has(id))).toBe(true);
  }
  expect(attempt.test.questions).toHaveLength(20);
});
it("persists mixed subject allocation of Physics 15 and Chemistry 20 without leaking answers", async () => {
  const { testId } = await generateTest(userId, {
    ...config,
    fullChapterIds: [phys, mole, electro],
    count: 35,
    allocation: "MANUAL_SUBJECT",
    subjectCounts: { [physicsId]: 15, [chemistryId]: 20 },
  });
  const attempt = await ownedAttempt(testId, userId),
    questions = attempt.test.questions.map((q) => asSnapshot(q.snapshot));
  expect(questions.filter((q) => q.subject === "Physics")).toHaveLength(15);
  expect(questions.filter((q) => q.subject === "Chemistry")).toHaveLength(20);
  const safe = await studentAttempt(testId, userId);
  expect(
    safe.questions.every(
      (q) => !("correctOption" in q) && !("explanation" in q),
    ),
  ).toBe(true);
});
it("enforces configurable Chemistry class/category quotas in a real persisted 45-question mock", async () => {
  await db.platformSettings.upsert({
    where: { key: "NEET_2027_PROVISIONAL" },
    create: {
      key: "NEET_2027_PROVISIONAL",
      value: {
        sections: { Chemistry: 45 },
        chemistryCoverage: policy,
        correct: 4,
        incorrect: -1,
        unanswered: 0,
      },
    },
    update: {
      value: {
        sections: { Chemistry: 45 },
        chemistryCoverage: policy,
        correct: 4,
        incorrect: -1,
        unanswered: 0,
      },
    },
  });
  const { testId } = await generateTest(userId, {
    ...config,
    kind: "CHEMISTRY_SECTION",
    fullChapterIds: [],
    topicIds: [],
    count: 45,
  });
  const attempt = await ownedAttempt(testId, userId),
    snapshots = attempt.test.questions.map((q) => asSnapshot(q.snapshot));
  expect(snapshots).toHaveLength(45);
  expect(new Set(snapshots.map((q) => q.id)).size).toBe(45);
  const counts: Record<string, number> = {};
  for (const q of snapshots) {
    expect(q.subject).toBe("Chemistry");
    expect(excluded.slice(2)).not.toContain(q.id);
    const c = syllabus.find((c) => c.id === q.chapterId)!;
    const key = `${c.classLevel} | ${c.category}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  expect(counts).toEqual(policy);
});
it("scores Chemistry NEET attempts on the server using +4/-1/0", async () => {
  const { testId, attemptId } = await generateTest(userId, {
    ...config,
    count: 3,
  });
  const a = await ownedAttempt(testId, userId);
  for (let i = 0; i < 2; i++)
    await db.questionResponse.create({
      data: {
        attemptId,
        testQuestionId: a.test.questions[i].id,
        selectedOption: i === 0 ? 1 : 0,
        revision: 1,
      },
    });
  await finalizeAttempt(attemptId, userId);
  expect(
    await db.testAttempt.findUnique({ where: { id: attemptId } }),
  ).toMatchObject({
    score: 3,
    correct: 1,
    incorrect: 1,
    unattempted: 1,
    status: "SUBMITTED",
  });
});
it("rejects unauthorized records through the legacy paper-practice endpoint too", async () => {
  await db.syllabusVersion.upsert({
    where: { id: "pyq-archive" },
    create: {
      id: "pyq-archive",
      name: "Isolated archive",
      active: false,
      year: 2026,
    },
    update: {},
  });
  const subject = await db.subject.create({
    data: {
      name: "Chemistry",
      slug: crypto.randomUUID(),
      syllabusId: "pyq-archive",
    },
  });
  const chapter = await db.chapter.create({
    data: {
      name: "Isolated paper",
      slug: crypto.randomUUID(),
      classLevel: 0,
      subjectId: subject.id,
      topics: {
        create: {
          id: "legacy-fixture-topic",
          name: "Fixture",
          slug: "fixture",
        },
      },
    },
  });
  const id = await fixture(chapter.id, "legacy-fixture-topic", {
    rights: "UNVERIFIED",
  });
  await db.question.update({ where: { id }, data: { tags: ["test-paper"] } });
  const response = await legacyPyq(
    new Request("http://localhost:3100/api/pyq", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3100",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paper: "test-paper",
        subject: "Chemistry",
        count: 1,
      }),
    }),
    { params: Promise.resolve({}) },
  );
  expect(response.status).toBe(422);
});
