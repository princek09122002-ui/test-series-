import "dotenv/config";
import { db } from "../src/lib/db";
import { availability } from "../src/lib/services/testing";
import { eligibleBankWhere } from "../src/lib/services/publication";
import { testConfigSchema } from "../src/lib/domain/validation";
import { importSubject } from "../src/lib/domain/import-source";

const chapterNames = ["Units And Measurements", "Laws Of Motion", "Gravitation", "Waves"];
const syllabus = await db.syllabusVersion.findFirstOrThrow({ where: { active: true } });
const chapters = await db.chapter.findMany({
  where: { active: true, name: { in: chapterNames }, subject: { name: "Physics", syllabusId: syllabus.id } },
  include: { topics: { where: { active: true }, select: { id: true } } },
  orderBy: { order: "asc" },
});
if (chapters.length !== chapterNames.length) throw new Error(`Expected four chapters; found ${chapters.map((c) => c.name).join(", ")}`);
const chapterIds = chapters.map((c) => c.id);
const topicIds = chapters.flatMap((c) => c.topics.map((t) => t.id));
const user = await db.user.findFirstOrThrow({ select: { id: true } });
const config = testConfigSchema.parse({
  name: "Exact Physics screenshot reproduction",
  kind: "CUSTOM",
  topicIds: [],
  fullChapterIds: chapterIds,
  count: 10,
  mode: "LEARNING",
  durationMinutes: null,
  difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
  exposure: "ALL",
  allocation: "AUTO",
  chapterCounts: {},
  language: "en",
  instantFeedback: false,
});

const allImportedSources = await db.sourceQuestion.findMany({
  include: { source: true },
});
const allPhysicsSources = allImportedSources.filter((q) => importSubject(q.source.metadata) === "Physics");
const allCanonical = await db.question.findMany({
  where: { importRecord: { isNot: null } },
  include: { options: true, topics: { include: { topic: true } }, importRecord: { include: { source: true } }, chapter: { include: { subject: true } } },
});
const canonical = allCanonical.filter((q) => q.importRecord && importSubject(q.importRecord.source.metadata) === "Physics");
const counts: Array<{ stage: string; count: number }> = [];
counts.push({ stage: "1. All source Physics records", count: allPhysicsSources.length });
counts.push({ stage: "2. Canonical Question records", count: canonical.length });
let rows = canonical.filter((q) => chapterIds.includes(q.chapterId));
counts.push({ stage: "3. Associated with selected chapters", count: rows.length });
rows = rows.filter((q) => q.topics.some((t) => !t.required && topicIds.includes(t.topicId)));
counts.push({ stage: "4. Associated with selected topics", count: rows.length });
rows = rows.filter((q) => q.topics.filter((t) => t.required).every((t) => topicIds.includes(t.topicId)));
counts.push({ stage: "5. Prerequisites satisfied", count: rows.length });
rows = rows.filter((q) => q.type === "SINGLE_CORRECT" && q.options.length === 4 && new Set(q.options.map((o) => o.position)).size === 4 && q.correctOption >= 0 && q.correctOption < 4);
counts.push({ stage: "6. Valid single-correct options", count: rows.length });
rows = rows.filter((q) => q.importRecord?.answerStatus === "VERIFIED");
counts.push({ stage: "7. Verified answers", count: rows.length });
rows = rows.filter((q) => q.importRecord?.reviewStatus === "APPROVED" && q.status === "APPROVED");
counts.push({ stage: "8. Academically approved", count: rows.length });
rows = rows.filter((q) => q.importRecord?.rightsStatus === "CLEARED" && q.importRecord.source.rightsStatus === "CLEARED");
counts.push({ stage: "9. Rights-cleared", count: rows.length });
rows = rows.filter((q) => q.active);
counts.push({ stage: "10. Published", count: rows.length });
rows = rows.filter((q) => q.importRecord?.eligibility === "ELIGIBLE" && q.importRecord.eligibilityVersion === "NEET-2027-PROVISIONAL");
counts.push({ stage: "11. Eligible under active syllabus version", count: rows.length });
rows = rows.filter((q) => q.language === "en");
counts.push({ stage: "12. English content", count: rows.length });
const easyRows = rows.filter((q) => q.difficulty === "EASY");
counts.push({ stage: "13. Matching Easy difficulty", count: easyRows.length });
const finalIds = new Set((await db.question.findMany({ where: { ...eligibleBankWhere, id: { in: easyRows.map((q) => q.id) } }, select: { id: true } })).map((q) => q.id));
counts.push({ stage: "14. Final eligible questions", count: easyRows.filter((q) => finalIds.has(q.id)).length });

const allSelectedCanonical = canonical.filter((q) => chapterIds.includes(q.chapterId));
const difficulty = Object.fromEntries(["EASY", "MEDIUM", "HARD"].map((d) => [d, allSelectedCanonical.filter((q) => !q.tags.includes("DIFFICULTY_UNRATED") && q.difficulty === d).length]));
const unrated = allSelectedCanonical.filter((q) => q.tags.includes("DIFFICULTY_UNRATED")).length;
const sourceStates = {
  sourceKeyVerified: allPhysicsSources.filter((q) => (q.extracted as { processing?: { keySourceVerified?: boolean } }).processing?.keySourceVerified).length,
  textTechnicalReady: allPhysicsSources.filter((q) => (q.extracted as { processing?: { textTechnicalReady?: boolean } }).processing?.textTechnicalReady).length,
  answerStatus: Object.fromEntries([...new Set(allPhysicsSources.map((q) => q.answerStatus))].map((s) => [s, allPhysicsSources.filter((q) => q.answerStatus === s).length])),
  reviewStatus: Object.fromEntries([...new Set(allPhysicsSources.map((q) => q.reviewStatus))].map((s) => [s, allPhysicsSources.filter((q) => q.reviewStatus === s).length])),
  rightsStatus: Object.fromEntries([...new Set(allPhysicsSources.map((q) => q.rightsStatus))].map((s) => [s, allPhysicsSources.filter((q) => q.rightsStatus === s).length])),
};
const actual = await availability(user.id, config);
console.log(JSON.stringify({
  request: config,
  syllabus: { id: syllabus.id, name: syllabus.name, year: syllabus.year, demo: syllabus.demo },
  chapters: chapters.map((c) => ({ id: c.id, name: c.name, topics: c.topics.length })),
  selectedTopicIds: topicIds,
  filters: { questionType: "SINGLE_CORRECT", publication: "active + APPROVED", answer: "VERIFIED", eligibility: "ELIGIBLE / NEET-2027-PROVISIONAL", language: "en", difficultyAtGeneration: "EASY 100%" },
  counts,
  firstZero: counts.find((row) => row.count === 0) ?? null,
  selectedCanonicalDifficulty: { ...difficulty, UNRATED_OR_UNKNOWN: unrated },
  sourceStates,
  availability: actual,
}, null, 2));
await db.$disconnect();
