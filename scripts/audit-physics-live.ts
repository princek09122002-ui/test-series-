import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { db } from "../src/lib/db";
import { eligibleBankWhere } from "../src/lib/services/publication";
import { preparePool } from "../src/lib/services/testing";
import { testConfigSchema } from "../src/lib/domain/validation";
const base = "http://127.0.0.1:3000",
  cookies = new Map<string, string>();
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(base + path, {
    ...options,
    redirect: "manual",
    headers: {
      ...options.headers,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    signal: AbortSignal.timeout(30000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const part = cookie.split(";")[0],
      i = part.indexOf("=");
    cookies.set(part.slice(0, i), part.slice(i + 1));
  }
  return response;
}
const assert = (ok: unknown, message: string) => {
  if (!ok) throw Error(message);
};
async function protectedState() {
  const models = [
    db.test,
    db.testQuestion,
    db.testAttempt,
    db.questionResponse,
    db.testAnalyticsSnapshot,
    db.mistakeRecord,
  ];
  const names = [
    "Test",
    "TestQuestion",
    "TestAttempt",
    "QuestionResponse",
    "TestAnalyticsSnapshot",
    "MistakeRecord",
  ];
  const result: Record<string, { count: number; hash: string }> = {};
  for (let i = 0; i < models.length; i++) {
    // Fixed model list; only reads historical assessment rows.
    const rows = await (models[i] as typeof db.test).findMany();
    result[names[i]] = {
      count: rows.length,
      hash: createHash("sha256")
        .update(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort()))
        .digest("hex"),
    };
  }
  return result;
}
async function main() {
  const before = await protectedState();
  const { student } = JSON.parse(
    readFileSync(".local/credentials.json", "utf8"),
  );
  const csrf = await (await request("/api/auth/csrf")).json();
  await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "http://localhost:3000",
    },
    body: new URLSearchParams({
      email: student.email,
      password: student.password,
      csrfToken: csrf.csrfToken,
      callbackUrl: "http://localhost:3000/dashboard",
      json: "true",
    }),
  });
  const session = await (await request("/api/auth/session")).json();
  assert(session.user?.id, "Authenticated student session required");
  const mixed = testConfigSchema.parse({
    name: "Physics source audit: exact mixed selection",
    kind: "CUSTOM",
    topicIds: ["physics-school-11-2-t6", "physics-school-11-2-t7"],
    fullChapterIds: ["physics-school-11-1", "physics-school-12-3"],
    count: 22,
    mode: "NEET",
    durationMinutes: 30,
    difficulty: { EASY: 0, MEDIUM: 100, HARD: 0 },
    exposure: "ALL",
    allocation: "AUTO",
    chapterCounts: {},
    sourceFilter: "PYQ",
    yearPreset: "ALL",
  });
  const section = {
    ...mixed,
    name: "Physics audit: provisional 45",
    kind: "PHYSICS_SECTION" as const,
    topicIds: [],
    fullChapterIds: [],
    count: 45,
    durationMinutes: 45,
  };
  const requests = [];
  for (const config of [mixed, section]) {
    const pool = await preparePool(session.user.id, config);
    const results = [];
    for (const endpoint of ["/api/tests/availability", "/api/tests"]) {
      const start = performance.now(),
        r = await request(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
          },
          body: JSON.stringify(config),
        });
      const body = await r.json();
      results.push({
        endpoint,
        status: r.status,
        elapsedMs: Math.round(performance.now() - start),
        body,
      });
      assert(
        endpoint.endsWith("availability")
          ? r.status === 200 && body.total === 0
          : r.status === 422,
        "Unexpected live generation result",
      );
    }
    requests.push({
      request: config,
      resolvedTopics: [...pool.selected].sort(),
      eligiblePool: pool.pool.length,
      results,
    });
  }
  const school = await db.chapter.findMany({
    where: {
      active: true,
      subject: { name: "Physics", syllabus: { active: true } },
    },
    include: { topics: { where: { active: true } } },
  });
  const expected = new Set([
    ...school
      .filter((c) => mixed.fullChapterIds.includes(c.id))
      .flatMap((c) => c.topics.map((t) => t.id)),
    ...mixed.topicIds,
  ]);
  assert(
    expected.size === 22 &&
      JSON.stringify([...expected].sort()) ===
        JSON.stringify(requests[0].resolvedTopics),
    "Mixed selection is not exact",
  );
  const allSources = await db.sourceQuestion.findMany({
    include: { source: true },
  });
  const live = await db.question.findMany({
    where: { chapter: { subject: { name: "Physics" } } },
    include: {
      options: true,
      topics: { include: { topic: true } },
      importRecord: true,
      chapter: true,
    },
  });
  const published = live.filter(
    (q) => q.active && q.status === "APPROVED" && q.chapter.active,
  );
  const violations = published.flatMap((q) => {
    const errors = [];
    const primary = q.topics.filter((t) => !t.required);
    if (
      !primary.length ||
      primary.some((t) => !t.topic.active || t.topic.chapterId !== q.chapterId)
    )
      errors.push("INVALID_PRIMARY_TOPICS");
    if (q.topics.some((t) => !t.topic.active))
      errors.push("INACTIVE_PREREQUISITE");
    if (
      q.options.length !== 4 ||
      q.correctOption < 0 ||
      q.correctOption > 3 ||
      new Set(q.options.map((o) => o.position)).size !== 4
    )
      errors.push("INVALID_OPTIONS_OR_ANSWER");
    const r = q.importRecord;
    if (
      r &&
      [
        r.answerStatus !== "VERIFIED",
        r.reviewStatus !== "APPROVED",
        r.rightsStatus !== "CLEARED",
        r.eligibility !== "ELIGIBLE",
        !r.rightsEvidence,
        !r.reviewEvidence,
      ].some(Boolean)
    )
      errors.push("MISSING_PUBLICATION_EVIDENCE");
    if (!r && !["ORIGINAL", "LICENSED", "PUBLIC_DOMAIN"].includes(q.license))
      errors.push("INVALID_LICENSE");
    return errors.length ? [{ id: q.id, errors }] : [];
  });
  const privateId = allSources[0].id;
  const mediaSecurity = {
    anonymous: (await fetch(base + "/api/admin/import-media/" + privateId))
      .status,
    student: (await request("/api/admin/import-media/" + privateId)).status,
  };
  assert(
    mediaSecurity.anonymous === 401 && mediaSecurity.student === 403,
    "Private source evidence is exposed",
  );
  const after = await protectedState();
  assert(
    JSON.stringify(before) === JSON.stringify(after),
    "Live audit changed historical assessment rows",
  );
  const group = (values: string[]) =>
    Object.fromEntries(
      [...new Set(values)]
        .sort()
        .map((v) => [v, values.filter((x) => x === v).length]),
    );
  const gateWhere = {
    AND: [
      eligibleBankWhere,
      {
        chapter: {
          active: true,
          subject: { name: "Physics", syllabus: { active: true } },
        },
      },
    ],
  };
  const counts = {
    sourceDocuments: new Set(allSources.map((r) => r.sourceId)).size,
    stagedQuestions: allSources.length,
    answerStatus: group(allSources.map((r) => r.answerStatus)),
    reviewStatus: group(allSources.map((r) => r.reviewStatus)),
    rightsStatus: group(allSources.map((r) => r.rightsStatus)),
    eligibility: group(allSources.map((r) => r.eligibility)),
    linkedQuestions: allSources.filter((r) => r.questionId).length,
    physicsQuestionRows: live.length,
    physicsQuestionStates: group(
      live.map(
        (q) =>
          `${q.status}/${q.active ? "active" : "inactive"}/${q.chapter.active ? "chapter-active" : "chapter-inactive"}`,
      ),
    ),
    publishedActiveChapter: published.length,
    eligiblePhysics: await db.question.count({ where: gateWhere }),
    eligiblePhysicsPyq: await db.question.count({
      where: { AND: [gateWhere, { tags: { has: "PYQ" } }] },
    }),
    schoolChapters: school.length,
    schoolTopics: school.reduce((sum, c) => sum + c.topics.length, 0),
  };
  const integrity = await db.$queryRaw<
    Array<{ invalidConstraints: bigint }>
  >`SELECT count(*) AS "invalidConstraints" FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f' AND NOT convalidated`;
  const report = {
    capturedAt: new Date().toISOString(),
    counts,
    publicationViolations: violations,
    requests,
    blueprint: await db.platformSettings.findUnique({
      where: { key: "NEET_2027_PROVISIONAL" },
    }),
    jobs: await db.importJob.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { processed: true },
    }),
    mediaSecurity,
    history: { before, after, unchanged: true },
    invalidForeignKeyConstraints: Number(integrity[0].invalidConstraints),
  };
  writeFileSync(
    ".local/physics-audit/live-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        counts,
        requests: requests.map((r) => ({
          kind: r.request.kind,
          selectedTopics: r.resolvedTopics.length,
          results: r.results,
        })),
        mediaSecurity,
        historyUnchanged: true,
        publicationViolations: violations,
      },
      null,
      2,
    ),
  );
}
main().finally(() => db.$disconnect());
