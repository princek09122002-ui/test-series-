import "dotenv/config";
import { db } from "../src/lib/db";
import { writeFileSync } from "node:fs";
async function main() {
  const [sources, records, chapters, questions, blueprint, jobs] =
    await Promise.all([
      db.sourceDocument.findMany(),
      db.sourceQuestion.findMany(),
      db.chapter.findMany({
        where: { subject: { name: "Physics" } },
        include: { unit: true, subject: true, topics: true },
        orderBy: [{ classLevel: "asc" }, { order: "asc" }],
      }),
      db.question.findMany({
        where: { chapter: { subject: { name: "Physics" } } },
        include: {
          options: true,
          topics: { include: { topic: true } },
          importRecord: true,
          chapter: { include: { subject: true } },
        },
      }),
      db.platformSettings.findUnique({
        where: { key: "NEET_2027_PROVISIONAL" },
      }),
      db.importJob.findMany(),
    ]);
  writeFileSync(
    ".local/physics-audit/database.json",
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        sources,
        records,
        chapters,
        questions,
        blueprint,
        jobs,
      },
      null,
      2,
    ),
  );
  console.log({
    sources: sources.length,
    records: records.length,
    schoolChapters: chapters.filter((c) => c.active && c.classLevel > 0).length,
    physicsQuestions: questions.length,
    publishedNew: questions.filter(
      (q) => q.importRecord && q.active && q.status === "APPROVED",
    ).length,
    jobs: jobs.map((j) => ({ status: j.status, processed: j.processed })),
  });
}
main().finally(() => db.$disconnect());
