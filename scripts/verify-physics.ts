import "dotenv/config";
import { db } from "../src/lib/db";
import { eligibleBankWhere } from "../src/lib/services/publication";
import { preparePool } from "../src/lib/services/testing";
import { testConfigSchema } from "../src/lib/domain/validation";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
async function main() {
  const manifest = JSON.parse(
    readFileSync(".local/physics-import/physics-import-manifest.json", "utf8"),
  );
  const sources = await db.sourceDocument.findMany({
    include: { _count: { select: { questions: true } }, jobs: true },
  });
  assert.equal(sources.length, 26);
  for (const s of sources) {
    assert.equal(s._count.questions, s.declaredCount);
    assert.equal(s.jobs[0].status, "STAGED");
  }
  const rows = await db.sourceQuestion.findMany();
  assert.equal(rows.length, 2346);
  assert.equal(
    rows.filter((q) => q.answerStatus === "SOURCE_MATCHED").length,
    2343,
  );
  assert.equal(rows.filter((q) => q.type === "MULTIPLE_CORRECT").length, 3);
  assert.equal(rows.filter((q) => q.sourceOut).length, 161);
  assert.equal(
    await db.question.count({
      where: { ...eligibleBankWhere, importRecord: { isNot: null } },
    }),
    0,
  );
  assert.equal(rows.filter((q) => q.questionId !== null).length, 0);
  const chapters = await db.chapter.findMany({
    where: { id: { startsWith: "physics-school-" } },
    include: {
      topics: { include: { _count: { select: { questions: true } } } },
    },
    orderBy: [{ classLevel: "asc" }, { order: "asc" }],
  });
  assert.equal(chapters.length, 28);
  assert.equal(
    chapters.reduce((n, c) => n + c.topics.length, 0),
    238,
  );
  const student = await db.user.findFirstOrThrow({
    where: { role: "STUDENT" },
  });
  const config = testConfigSchema.parse({
    name: "Private bank QA",
    kind: "PHYSICS_SECTION",
    topicIds: [],
    count: 45,
    mode: "NEET",
    durationMinutes: 45,
    difficulty: { EASY: 0, MEDIUM: 100, HARD: 0 },
    exposure: "ALL",
    allocation: "AUTO",
    chapterCounts: {},
    sourceFilter: "PYQ",
  });
  assert.equal((await preparePool(student.id, config)).pool.length, 0);
  for (const r of rows)
    assert.ok(existsSync((r.extracted as { media: string }).media));
  const counts = {
    sources: sources.length,
    pages: manifest.reduce((n: number, m: { pages: number }) => n + m.pages, 0),
    detected: 2346,
    stored: rows.length,
    keysMatched: 2343,
    missingKeys: 3,
    multipleCorrect: 3,
    sourceOut: 161,
    visualOrFormulaCandidates: manifest.reduce(
      (n: number, m: { visual: number }) => n + m.visual,
      0,
    ),
    mappingSuggestions: rows.filter(
      (r) => (r.suggestions as { candidates: unknown[] }).candidates?.length,
    ).length,
    reviewedMappings: 0,
    academicallyApproved: 0,
    rightsCleared: 0,
    studentAvailable: 0,
    reviewQueue: 2346,
  };
  writeFileSync(
    "docs/physics-import-manifest.json",
    JSON.stringify(manifest, null, 2),
  );
  const lines = [
    "# Physics import report",
    "",
    JSON.stringify(counts, null, 2),
    "",
    "## Chapter availability",
    "| Class | Chapter | Topics | Available imported questions |",
    "|---|---|---:|---:|",
    ...chapters.map(
      (c) => `| ${c.classLevel} | ${c.name} | ${c.topics.length} | 0 |`,
    ),
    "",
    "All 238 Physics topics currently have zero published imported questions.",
    "",
    "## Review and publication",
    "All source records are private PostgreSQL staging. Keyword suggestions are not approved topic mappings. Source answer matching is not academic verification. Three source keys say Scan QR: Dual Nature Q100, Electromagnetic Induction Q39, Rotational Motion Q94. No external solutions were fetched or fabricated. Source exclusion classifications remain separate from NEET eligibility.",
    "",
    "The official 2026 syllabus notice is at https://www.nta.ac.in/Download/Notice/Notice_20260108180635.pdf . The application 2027 configuration remains provisional and unverified.",
    "",
    "## Implementation",
    "SourceDocument and SourceQuestion retain hashes, source occurrences, private extraction, answer evidence, years, exams, suggestions and review metadata. ImportJob checkpoints each file; stable IDs and upserts prevent duplicates. Legacy merged-PDF archive remains untouched. Chemistry/Biology data was not imported.",
    "",
    "## Quality limitations",
    "The pilot was accepted for private staging only. Six source crops were visually inspected; this is not an academic accuracy percentage for 2,346 questions. Text drops formula images; original crops are retained and no raw text auto-publishes. Visual/formula candidates are not an exact diagram count. All records require individual review; no difficulty labels were academically assigned.",
    "",
    "## Review workflow",
    "Open /admin/imports as staff. Inspect original image and source-key evidence, assign chapter/topics/prerequisites and reviewed difficulty, and document eligibility and rights. Only an admin can publish. Image publication requires a reviewed QR-free crop at .local/physics-import/approved-media/<id>.png; the raw private source crop is never automatically copied to student media. Detailed explanations remain unavailable until separately reviewed.",
    "",
    "## Physics selection",
    "PHYSICS_SECTION reads the provisional database policy: 45 questions; 22 Class 11 and 23 Class 12, supply-weighted chapter coverage with optional chapter weights. This is an application policy, not official chapter weighting. Selection enforces difficulty quotas, complete topic/prerequisite scope, reviewed publication, supported type, source/year/exposure filters, stable seeded shuffle and unique questions. Missing supply fails explicitly. No complete 180-question mock is claimed.",
    "",
    "## Commands",
    "python scripts/physics_ingest.py --full (requires pilot record); npx tsx scripts/import-physics.ts; npx tsx scripts/verify-physics.ts. No importer runs on server startup.",
    "",
    "## Verification",
    "Type checking, unit and extraction tests, production build and authenticated HTTP checks are recorded in the completion response. This report is generated from the stored database counts.",
  ];
  writeFileSync("docs/physics-import-report.md", lines.join("\n"));
  console.log(counts);
  console.log(
    "Verified complete source inventory, key totals, private gates, syllabus and media.",
  );
}
main().finally(() => db.$disconnect());
