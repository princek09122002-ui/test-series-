import "dotenv/config";
import { db } from "../src/lib/db";
import { readFileSync, writeFileSync } from "node:fs";
import type { Prisma } from "../src/generated/prisma/client";
async function main() {
  const audit = JSON.parse(
    readFileSync(".local/physics-audit/source-reconciliation.json", "utf8"),
  );
  const repairs: Record<string, unknown> = {};
  const originals = [];
  await db.$transaction(async (tx) => {
    for (const exception of audit.keyExceptions) {
      const source = await tx.sourceDocument.findFirstOrThrow({
        where: { title: exception.source },
      });
      const row = await tx.sourceQuestion.findUniqueOrThrow({
        where: {
          sourceId_sourceNumber: {
            sourceId: source.id,
            sourceNumber: exception.question,
          },
        },
      });
      originals.push(row);
      const e = row.extracted as Record<string, Prisma.InputJsonValue>;
      if (e.answer !== null || row.answerStatus !== "REVIEW_REQUIRED")
        throw Error("Record changed; refusing evidence-only repair");
      const fixed = {
        ...e,
        answerEvidence: [
          {
            answer: null,
            page: exception.key.page,
            evidence: exception.key.raw,
          },
        ],
      };
      repairs[row.id] = fixed;
      await tx.sourceQuestion.update({
        where: { id: row.id },
        data: { extracted: fixed },
      });
    }
  });
  for (const file of [
    ".local/physics-import/questions.json",
    ...audit.keyExceptions.map(
      (x: { source: string }) =>
        ".local/physics-import/batches/" +
        audit.files.find((f: { source: string }) => f.source === x.source)
          .sha256 +
        ".json",
    ),
  ]) {
    const rows = JSON.parse(readFileSync(file, "utf8"));
    writeFileSync(
      file,
      JSON.stringify(rows.map((r: { id: string }) => repairs[r.id] ?? r)),
    );
  }
  writeFileSync(
    ".local/physics-audit/key-evidence-repairs.json",
    JSON.stringify(
      { count: Object.keys(repairs).length, changes: repairs },
      null,
      2,
    ),
  );
  console.log(
    "Restored source key evidence for",
    Object.keys(repairs).length,
    "unresolved answers; no answer or publication status changed.",
  );
}
main().finally(() => db.$disconnect());
