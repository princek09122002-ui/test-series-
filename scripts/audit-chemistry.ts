import { analytics } from "../src/lib/domain/scoring";
import "dotenv/config";
import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { db } from "../src/lib/db";
import { eligibleBankWhere } from "../src/lib/services/publication";
const dir = ".local/chemistry-import/";
const canonical = (x: unknown): string =>
  JSON.stringify(x, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
const norm = (rows: unknown[]) => canonical(rows.map(canonical).sort());
const hash = (rows: unknown[]) =>
  createHash("sha256").update(norm(rows)).digest("hex");
async function main() {
  const backup = JSON.parse(
    readFileSync(readFileSync(dir + "backup-path.txt", "utf8"), "utf8"),
  );
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const protectedNames = [
    "User",
    "UserProfile",
    "SyllabusVersion",
    "Subject",
    "Question",
    "QuestionOption",
    "QuestionTopic",
    "QuestionMedia",
    "QuestionVersion",
    "Test",
    "TestQuestion",
    "TestAttempt",
    "QuestionResponse",
    "TestAnalyticsSnapshot",
    "MistakeRecord",
    "UserTopicProgress",
    "RevisionTask",
    "RevisionAttempt",
  ];
  const preservation: Record<string, unknown> = {};
  const expiryTransitions: Record<string, ReturnType<typeof analytics>> = {};
  for (const name of protectedNames) {
    const current = (
      await client.query(`SELECT row_to_json(t) AS row FROM "${name}" t`)
    ).rows.map((r) => r.row);
    const before = backup.tables[name];
    const unchanged = norm(before) === norm(current);
    let expiryValidated = false;
    if (!unchanged && name === "TestAttempt") {
      if (before.length !== current.length)
        throw Error("Attempt count changed");
      for (const row of current) {
        const old = before.find((r: { id: string }) => r.id === row.id);
        if (canonical(old) === canonical(row)) continue;
        if (
          old.status !== "ACTIVE" ||
          row.status !== "SUBMITTED" ||
          !old.deadline ||
          old.deadline !== row.submittedAt ||
          new Date(old.deadline).getTime() > Date.now()
        )
          throw Error("Unexpected historical attempt edit");
        const config = backup.tables.TestConfiguration.find(
          (c: { testId: string }) => c.testId === row.testId,
        );
        const questions = backup.tables.TestQuestion.filter(
          (q: { testId: string }) => q.testId === row.testId,
        );
        const outcomes = questions.map(
          (q: {
            id: string;
            snapshot: {
              correctOption: number;
              subject: string;
              chapter: string;
              topics: { id: string; name: string }[];
            };
          }) => {
            const response = backup.tables.QuestionResponse.find(
              (r: { attemptId: string; testQuestionId: string }) =>
                r.attemptId === row.id && r.testQuestionId === q.id,
            );
            return {
              id: q.id,
              correctOption: q.snapshot.correctOption,
              selectedOption: response?.selectedOption ?? null,
              activeMs: response?.activeMs ?? 0,
              subject: q.snapshot.subject,
              chapter: q.snapshot.chapter,
              topics: q.snapshot.topics,
            };
          },
        );
        const result = analytics(outcomes, config);
        const permitted = [
          "status",
          "submittedAt",
          "score",
          "maximum",
          "correct",
          "incorrect",
          "unattempted",
        ];
        if (
          Object.keys(old).some(
            (k) =>
              !permitted.includes(k) && canonical(old[k]) !== canonical(row[k]),
          )
        )
          throw Error("Unexpected attempt metadata change");
        for (const key of [
          "score",
          "maximum",
          "correct",
          "incorrect",
          "unattempted",
        ] as const)
          if (row[key] !== result[key]) throw Error("Expiry scoring mismatch");
        expiryTransitions[row.id] = result;
      }
      expiryValidated = true;
    } else if (!unchanged && name === "TestAnalyticsSnapshot") {
      for (const old of before)
        if (!current.some((r) => canonical(r) === canonical(old)))
          throw Error("Existing analytics changed");
      const additions = current.filter(
        (r) =>
          !before.some(
            (b: { attemptId: string }) => b.attemptId === r.attemptId,
          ),
      );
      if (
        additions.some(
          (r) =>
            !expiryTransitions[r.attemptId] ||
            canonical(r.data) !== canonical(expiryTransitions[r.attemptId]),
        )
      )
        throw Error("Unexpected analytics additions");
      expiryValidated = true;
    }
    preservation[name] = {
      before: before.length,
      after: current.length,
      unchanged,
      expiryValidated,
    };
    if (!unchanged && !expiryValidated)
      throw Error("Protected table changed: " + name);
  }
  const phySubjectIds = new Set(
    backup.tables.Subject.filter(
      (s: { name: string }) => s.name === "Physics",
    ).map((s: { id: string }) => s.id),
  );
  const phyChapters = backup.tables.Chapter.filter((c: { subjectId: string }) =>
    phySubjectIds.has(c.subjectId),
  );
  const phyChapterIds = new Set(phyChapters.map((c: { id: string }) => c.id));
  for (const [name, before] of [
    ["Chapter", phyChapters],
    [
      "Topic",
      backup.tables.Topic.filter((t: { chapterId: string }) =>
        phyChapterIds.has(t.chapterId),
      ),
    ],
    ["SourceDocument", backup.tables.SourceDocument],
    ["SourceQuestion", backup.tables.SourceQuestion],
  ] as const) {
    const current = (
      await client.query(
        `SELECT row_to_json(t) AS row FROM "${name}" t WHERE id=ANY($1::text[])`,
        [before.map((r: { id: string }) => r.id)],
      )
    ).rows.map((r) => r.row);
    const unchanged = norm(before) === norm(current);
    preservation["Physics " + name] = {
      before: before.length,
      after: current.length,
      unchanged,
    };
    if (!unchanged) throw Error("Physics content changed: " + name);
  }
  const foreignKeys = (
    await client.query(
      "SELECT count(*)::int AS count FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f' AND NOT convalidated",
    )
  ).rows[0].count;
  await client.end();
  const sources = await db.sourceDocument.findMany({
    where: { metadata: { path: ["subject"], equals: "Chemistry" } },
    include: { jobs: true },
    orderBy: { title: "asc" },
  });
  const records = await db.sourceQuestion.findMany({
    where: { sourceId: { in: sources.map((s) => s.id) } },
  });
  const chapters = await db.chapter.findMany({
    where: { id: { startsWith: "chemistry-school-" } },
    include: { topics: { orderBy: { order: "asc" } } },
    orderBy: [{ classLevel: "asc" }, { order: "asc" }],
  });
  const group = (xs: string[]) =>
    Object.fromEntries(
      [...new Set(xs)].sort().map((x) => [x, xs.filter((v) => v === x).length]),
    );
  const counts = {
    sources: sources.length,
    pages: sources.reduce((n, s) => n + s.pageCount, 0),
    declared: sources.reduce((n, s) => n + s.declaredCount, 0),
    staged: records.length,
    answerStatus: group(records.map((r) => r.answerStatus)),
    reviewStatus: group(records.map((r) => r.reviewStatus)),
    rightsStatus: group(records.map((r) => r.rightsStatus)),
    eligibility: group(records.map((r) => r.eligibility)),
    singleCorrect: records.filter((r) => r.type === "SINGLE_CORRECT").length,
    multipleCorrect: records.filter((r) => r.type === "MULTIPLE_CORRECT")
      .length,
    sourceOut: records.filter((r) => r.sourceOut).length,
    visualCandidates: records.filter(
      (r) => (r.extracted as { visual?: boolean }).visual,
    ).length,
    sourceScopeMapped: records.filter(
      (r) =>
        (
          (r.suggestions as { candidateChapterIds?: string[] })
            .candidateChapterIds ?? []
        ).length,
    ).length,
    topicSuggestions: records.filter(
      (r) =>
        ((r.suggestions as { candidates?: unknown[] }).candidates ?? []).length,
    ).length,
    reviewedMappings: records.filter((r) => r.reviewStatus === "APPROVED")
      .length,
    publishedLinks: records.filter((r) => r.questionId).length,
    eligibleChemistry: await db.question.count({
      where: {
        AND: [
          eligibleBankWhere,
          {
            chapter: {
              active: true,
              subject: { name: "Chemistry", syllabus: { active: true } },
            },
          },
        ],
      },
    }),
    chapters: chapters.length,
    topics: chapters.reduce((n, c) => n + c.topics.length, 0),
    unvalidatedForeignKeys: foreignKeys,
  };
  const snapshot = {
    capturedAt: new Date().toISOString(),
    counts,
    sources,
    records,
    chapters,
    preservation,
    validatedExpiryAttemptIds: Object.keys(expiryTransitions),
    recordsHash: hash(records),
    blueprint: await db.platformSettings.findUnique({
      where: { key: "NEET_2027_PROVISIONAL" },
    }),
  };
  writeFileSync(dir + "database-audit.json", JSON.stringify(snapshot, null, 2));
  console.log(
    JSON.stringify(
      { counts, preservation, recordsHash: snapshot.recordsHash },
      null,
      2,
    ),
  );
}
main().finally(() => db.$disconnect());
