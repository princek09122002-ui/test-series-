/** Idempotent private staging -> canonical Question drafts. Never publishes. */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { db } from "../src/lib/db";

const dryRun = process.argv.includes("--dry-run");
const current = await db.$queryRaw<Array<{ database: string }>>`select current_database() database`;
if (current[0]?.database !== "neet_adaptive_utf8") throw Error("Unexpected database");
const all = await db.sourceQuestion.findMany({
  where: {
    questionId: null,
    answerStatus: "VERIFIED",
    reviewStatus: "PENDING",
    type: "SINGLE_CORRECT",
    sourceOut: false,
    extracted: { path: ["processing", "textTechnicalReady"], equals: true },
  },
  include: { source: { select: { title: true, metadata: true } } },
  orderBy: { id: "asc" },
});
const chapters = await db.chapter.findMany({
  where: { active: true, subject: { syllabus: { active: true } } },
  select: { id: true, subject: { select: { name: true } }, topics: { where: { active: true }, select: { id: true } } },
});
const byChapter = new Map(chapters.map((c) => [c.id, c]));
const rows = [];
const skipped = { noUniqueChapter: 0, missingText: 0, idConflict: 0 };
for (const row of all) {
  const s = row.suggestions as { candidateChapterIds?: string[]; candidates?: Array<{ chapterId: string; topicId: string; score: number }> };
  const e = row.extracted as { stem?: string; options?: string[]; answer?: string; processing?: { keySourceVerified?: boolean } };
  const candidateChapterIds = [...new Set((s.candidateChapterIds ?? []).filter((id) => byChapter.has(id)))];
  if (candidateChapterIds.length !== 1) { skipped.noUniqueChapter++; continue; }
  const chapter = byChapter.get(candidateChapterIds[0])!;
  const subject = (row.source.metadata as { subject?: string }).subject ?? "Physics";
  if (chapter.subject.name !== subject) { skipped.noUniqueChapter++; continue; }
  if (!e.processing?.keySourceVerified || !e.stem || e.options?.length !== 4 || !e.answer || !"ABCD".includes(e.answer)) {
    skipped.missingText++; continue;
  }
  const candidates = (s.candidates ?? [])
    .filter((c) => c.chapterId === chapter.id && chapter.topics.some((t) => t.id === c.topicId) && c.score >= 2)
    .sort((a, b) => b.score - a.score);
  const topicIds = candidates.length && (!candidates[1] || candidates[0].score > candidates[1].score)
    ? [candidates[0].topicId] : [];
  rows.push({ row, chapterId: chapter.id, topicIds, stem: e.stem, options: e.options, answer: "ABCD".indexOf(e.answer) });
}
const currentIds = new Set((await db.question.findMany({ where: { id: { in: rows.map((r) => r.row.id) } }, select: { id: true } })).map((r) => r.id));
const prepared = rows.filter((r) => { if (currentIds.has(r.row.id)) { skipped.idConflict++; return false; } return true; });
const summary = { technicallyReadyWithKey: all.length, canonicalDraftCandidates: prepared.length,
  provisionalTopicCandidates: prepared.filter((r) => r.topicIds.length).length, skipped, dryRun };
if (!dryRun) {
  const backupDir = ".local/backups";
  mkdirSync(backupDir, { recursive: true });
  const backupPath = `${backupDir}/pre-canonical-drafts-${new Date().toISOString().replaceAll(":", "-")}.json`;
  writeFileSync(backupPath, JSON.stringify({
    currentQuestionCount: await db.question.count(), currentLinkedSourceCount: await db.sourceQuestion.count({ where: { questionId: { not: null } } }),
    plannedIds: prepared.map((r) => r.row.id),
  }));
  let created = 0, linked = 0, suggestedTopics = 0;
  for (let i = 0; i < prepared.length; i += 150) {
    const batch = prepared.slice(i, i + 150);
    await db.$transaction(async (tx) => {
      const result = await tx.question.createMany({
        data: batch.map(({ row, chapterId, stem, answer }) => ({
          id: row.id, chapterId, text: stem,
          explanation: "Private imported draft; academic explanation pending.",
          correctOption: answer, difficulty: "EASY", language: "en",
          source: `${row.source.title} | ${row.exam} | Q${row.sourceNumber} | page ${row.page}`,
          license: "UNVERIFIED", tags: ["PYQ", "IMPORT_DRAFT", "DIFFICULTY_UNRATED"],
          status: "PENDING", active: false, examYear: row.year,
          contentHash: row.contentHash, type: "SINGLE_CORRECT",
        })), skipDuplicates: true,
      });
      created += result.count;
      await tx.questionOption.createMany({
        data: batch.flatMap(({ row, options }) => options.map((text, position) => ({
          id: randomUUID(), questionId: row.id, position, text,
        }))), skipDuplicates: true,
      });
      const topicRows = batch.flatMap(({ row, topicIds }) => topicIds.map((topicId) => ({
        questionId: row.id, topicId, required: false,
      })));
      if (topicRows.length) {
        const result = await tx.questionTopic.createMany({ data: topicRows, skipDuplicates: true });
        suggestedTopics += result.count;
      }
      const ids = batch.map((r) => r.row.id);
      linked += await tx.$executeRawUnsafe(
        'update "SourceQuestion" set "questionId" = id where id = any($1::text[]) and "questionId" is null',
        ids,
      );
    }, { timeout: 60000 });
  }
  Object.assign(summary, { created, linked, suggestedTopics, backupPath });
}
console.log(JSON.stringify(summary));
await db.$disconnect();
