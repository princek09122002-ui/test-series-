import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";
const rows = JSON.parse(
  readFileSync(".local/pyq-ingest/app-import.json", "utf8"),
);
async function main() {
  const syllabus = await db.syllabusVersion.upsert({
    where: { id: "pyq-archive" },
    create: {
      id: "pyq-archive",
      name: "Uploaded PYQ archive — topic mapping pending",
      year: 2026,
      active: false,
      demo: false,
    },
    update: {},
  });
  let imported = 0,
    available = 0;
  for (const r of rows) {
    if (!/^[A-D]$/.test(r.answer_raw ?? "")) continue;
    const subjectId = "pyq-" + r.subject.toLowerCase();
    await db.subject.upsert({
      where: { id: subjectId },
      create: {
        id: subjectId,
        name: r.subject,
        slug: r.subject.toLowerCase(),
        syllabusId: syllabus.id,
      },
      update: {},
    });
    const chapterId = r.paper_id + "-" + r.subject.toLowerCase();
    await db.chapter.upsert({
      where: { id: chapterId },
      create: {
        id: chapterId,
        name: r.paper + " · " + r.subject,
        slug: chapterId,
        classLevel: 0,
        classification: "SOURCE_PAPER_UNMAPPED",
        subjectId,
      },
      update: {},
    });
    const flags = JSON.parse(r.flags_json);
    const usable =
      !flags.includes("SOURCE_OUT_OF_SYLLABUS") &&
      !flags.includes("NON_SINGLE_CORRECT_TYPE");
    const data = {
      chapterId,
      text: r.image ? `${r.paper} · ${r.subject} · Q${r.number}` : r.stem,
      explanation:
        "Answer transcribed from the supplied compilation. A reviewed explanation is not yet available.",
      correctOption: "ABCD".indexOf(r.answer_raw),
      difficulty: "MEDIUM" as const,
      source: `${r.paper} | Q${r.number} | PDF page ${r.page} | key page ${r.answer_page}`,
      license: "USER_PROVIDED",
      tags: [
        "PYQ",
        r.paper_id,
        "DIFFICULTY_UNRATED",
        "TOPIC_UNMAPPED",
        r.image ? "SOURCE_IMAGE" : "SOURCE_TEXT",
        ...flags,
      ],
      status: usable ? ("APPROVED" as const) : ("DRAFT" as const),
      active: usable,
    };
    await db.$transaction(async (tx) => {
      await tx.question.upsert({
        where: { id: r.id },
        create: { id: r.id, ...data },
        update: data,
      });
      await tx.questionOption.deleteMany({ where: { questionId: r.id } });
      await tx.questionOption.createMany({
        data: ["a", "b", "c", "d"].map((c, i) => ({
          questionId: r.id,
          position: i,
          text: r.image
            ? `Option ${"ABCD"[i]} (shown above)`
            : r["option_" + c],
        })),
      });
      await tx.questionMedia.deleteMany({ where: { questionId: r.id } });
      if (r.image)
        await tx.questionMedia.create({
          data: {
            questionId: r.id,
            url: "/api/question-media/" + r.id,
            alt: `${r.paper} Q${r.number}: original question and all four options`,
          },
        });
    });
    imported++;
    if (usable) available++;
  }
  console.log(
    JSON.stringify({
      imported,
      available,
      held: imported - available,
      ambiguousKeysHeldInStaging: rows.length - imported,
    }),
  );
}
main().finally(() => db.$disconnect());
