import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { db } from "../src/lib/db";
import type { Prisma } from "../src/generated/prisma/client";
import {
  suggestChemistryMapping,
  type ChemistryChapter,
} from "../src/lib/domain/chemistry-classification";
const dir = ".local/chemistry-import/";
type SchoolChapter = Omit<ChemistryChapter, "topics"> & {
  name: string;
  classLevel: number;
  number: number;
  unit: string;
  scope: string;
  source: string;
  page: number;
  sourceText: string;
  topics: (ChemistryChapter["topics"][number] & { sourceRef: string })[];
};
const syllabus: SchoolChapter[] = JSON.parse(
  readFileSync(dir + "syllabus.json", "utf8"),
);
async function main() {
  if (
    !existsSync(dir + "backup-path.txt") ||
    !existsSync(readFileSync(dir + "backup-path.txt", "utf8"))
  )
    throw Error("A pre-import backup is required");
  const active = await db.syllabusVersion.findFirstOrThrow({
    where: { active: true },
    include: { subjects: true },
  });
  const subject = active.subjects.find((s) => s.name === "Chemistry");
  if (!subject) throw Error("Existing Chemistry subject is required");
  await db.$transaction(
    async (tx) => {
      for (const c of syllabus) {
        const unitId = "chemistry-unit-" + c.id;
        await tx.syllabusUnit.upsert({
          where: { id: unitId },
          create: {
            id: unitId,
            name: c.unit,
            classLevel: c.classLevel,
            subjectId: subject.id,
            sourceRef: c.source,
          },
          update: {},
        });
        await tx.chapter.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            name: c.name,
            slug: c.id,
            classLevel: c.classLevel,
            subjectId: subject.id,
            unitId,
            sourceRef: `${c.source}#page=${c.page}; scope=${c.scope}`,
            classification: c.category,
            order: c.number,
          },
          update: {},
        });
        for (const [i, t] of c.topics.entries())
          await tx.topic.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              name: t.name,
              slug: t.id,
              chapterId: c.id,
              parentId: t.parentId,
              order: i,
              ncertRef: t.sourceRef,
              description: c.sourceText,
              eligibility: "UNVERIFIED",
            },
            update: {},
          });
      }
      await tx.chapter.updateMany({
        where: {
          subjectId: subject.id,
          id: { in: ["demo-mole", "demo-atom", "demo-solutions"] },
        },
        data: { active: false },
      });
      const row = await tx.platformSettings.findUniqueOrThrow({
        where: { key: "NEET_2027_PROVISIONAL" },
      });
      const old = row.value as Prisma.JsonObject;
      if (!old.chemistryCoverage)
        await tx.platformSettings.update({
          where: { key: row.key },
          data: {
            value: {
              ...old,
              chemistryCoverage: {
                "11 | Physical Chemistry": 8,
                "11 | Inorganic Chemistry": 8,
                "11 | Organic Chemistry": 6,
                "12 | Physical Chemistry": 7,
                "12 | Inorganic Chemistry": 7,
                "12 | Organic Chemistry": 9,
              },
              chemistryChapterPolicy:
                "Provisional configurable class/category quotas; supply-weighted chapters within each group. Not official NEET weightage.",
            },
          },
        });
    },
    { timeout: 60000 },
  );
  console.log(
    "Chemistry syllabus:",
    syllabus.length,
    "chapters;",
    syllabus.reduce((n, c) => n + c.topics.length, 0),
    "topics/subtopics",
  );
  if (process.argv.includes("--syllabus-only")) return;
  if (!existsSync(dir + "pilot-reviewed.json"))
    throw Error("Pilot review required");
  const manifest = JSON.parse(
    readFileSync(dir + "chemistry-import-manifest.json", "utf8"),
  );
  for (const m of manifest) {
    if (m.errors.length)
      throw Error("Unresolved structural extraction error: " + m.title);
    await db.sourceDocument.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        fileName: m.file,
        title: m.title,
        sha256: m.id,
        pageCount: m.pages,
        declaredCount: m.declared,
        metadata: m,
      },
      update: {},
    });
    const jid = m.id + ":" + m.version;
    await db.importJob.upsert({
      where: { id: jid },
      create: {
        id: jid,
        sourceId: m.id,
        version: m.version,
        status: "RUNNING",
        errors: [],
      },
      update: { status: "RUNNING" },
    });
    try {
      const records = JSON.parse(
        readFileSync(dir + "batches/" + m.id + ".json", "utf8"),
      );
      let processed = 0;
      for (const r of records) {
        await db.sourceQuestion.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            sourceId: m.id,
            sourceNumber: r.number,
            year: r.year,
            exam: r.exam,
            page: r.page,
            type: r.kind,
            sourceOut: r.sourceOut,
            contentHash: r.contentHash,
            extracted: r,
            suggestions: suggestChemistryMapping(
              m.title,
              r.sourceText,
              syllabus,
            ),
            answerStatus: r.answerStatus,
          },
          update: {},
        });
        processed++;
        if (processed % 25 === 0)
          await db.importJob.update({
            where: { id: jid },
            data: { processed },
          });
      }
      await db.importJob.update({
        where: { id: jid },
        data: { status: "STAGED", processed, errors: [] },
      });
      console.log(m.title, processed);
    } catch (e) {
      await db.importJob.update({
        where: { id: jid },
        data: { status: "FAILED", errors: [String(e)] },
      });
      throw e;
    }
  }
}
main().finally(() => db.$disconnect());
