import {suggestPhysicsMapping} from "../src/lib/domain/physics-classification";
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";
import type { Prisma } from "../src/generated/prisma/client";
const dir = ".local/physics-import/";
const syllabus = JSON.parse(readFileSync(dir + "syllabus.json", "utf8"));
const manifest = JSON.parse(
  readFileSync(dir + "physics-import-manifest.json", "utf8"),
);
async function main() {
  const active = await db.syllabusVersion.findFirstOrThrow({
    where: { active: true },
    include: { subjects: true },
  });
  const subject = active.subjects.find((s) => s.name === "Physics")!;
  await db.$transaction(
    async (tx) => {
      for (const c of syllabus) {
        const unitId =
          `school-${c.classLevel}-` +
          c.unit.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await tx.syllabusUnit.upsert({
          where: { id: unitId },
          create: {
            id: unitId,
            name: c.unit,
            classLevel: c.classLevel,
            subjectId: subject.id,
            sourceRef: c.source,
          },
          update: { name: c.unit },
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
            sourceRef: c.source + ":" + c.page,
            classification: "SCHOOL_NEET_UNVERIFIED",
            order: c.number,
          },
          update: { name: c.name, unitId, sourceRef: c.source + ":" + c.page },
        });
        for (const [i, t] of c.topics.entries())
          await tx.topic.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              name: t.name,
              slug: t.id,
              chapterId: c.id,
              order: i,
              ncertRef: t.sourceRef,
              description: c.sourceText,
            },
            update: { name: t.name, ncertRef: t.sourceRef },
          });
      }
      // Preserve demonstration questions and historical references, but show only the complete school taxonomy for Physics.
      await tx.chapter.updateMany({
        where: {
          subjectId: subject.id,
          id: { notIn: syllabus.map((c: { id: string }) => c.id) },
        },
        data: { active: false },
      });
      await tx.platformSettings.upsert({
        where: { key: "NEET_2027_PROVISIONAL" },
        create: {
          key: "NEET_2027_PROVISIONAL",
          value: {
            status: "PROVISIONAL",
            exam: "NEET UG",
            year: 2027,
            total: 180,
            marks: 720,
            durationMinutes: 180,
            sections: { Physics: 45, Chemistry: 45, Biology: 90 },
            correct: 4,
            incorrect: -1,
            unanswered: 0,
            examMode: "UNCONFIRMED",
            eligibility: "UNVERIFIED",
            physicsClassCounts: { 11: 22, 12: 23 },
            chapterPolicy:
              "Supply-weighted within each class, not official chapter weights",
          },
        },
        update: {},
      });
    },
    { timeout: 60000 },
  );
  for (const m of manifest) {
    const data = {
      fileName: m.file,
      title: m.title,
      sha256: m.id,
      pageCount: m.pages,
      declaredCount: m.declared,
      metadata: m as Prisma.InputJsonValue,
    };
    await db.sourceDocument.upsert({
      where: { id: m.id },
      create: { id: m.id, ...data },
      update: { metadata: data.metadata },
    });
    const jid = m.id + ":physics-v1";
    await db.importJob.upsert({
      where: { id: jid },
      create: {
        id: jid,
        sourceId: m.id,
        version: "physics-v1",
        status: "RUNNING",
        errors: [],
      },
      update: { status: "RUNNING" },
    });
    try {
      const rows = JSON.parse(
        readFileSync(dir + "batches/" + m.id + ".json", "utf8"),
      );
      let processed = 0;
      for (const r of rows) {
        const row = {
          sourceId: m.id,
          sourceNumber: r.number,
          year: r.year,
          exam: r.exam,
          page: r.page,
          type: r.kind,
          sourceOut: r.sourceOut,
          contentHash: r.contentHash,
          extracted: r as Prisma.InputJsonValue,
          suggestions: suggestPhysicsMapping(m.title,r.stem,syllabus),
          answerStatus: r.answerStatus,
        };
        await db.sourceQuestion.upsert({
          where: { id: r.id },
          create: { id: r.id, ...row },
          update: {},
        });
        await db.sourceQuestion.updateMany({where:{id:r.id,reviewEvidence:null,questionId:null,reviewStatus:"PENDING"},data:{suggestions:row.suggestions}});
        processed++;
      }
      await db.importJob.update({
        where: { id: jid },
        data: {
          status: m.errors.length ? "REVIEW_REQUIRED" : "STAGED",
          processed,
          errors: m.errors,
        },
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
