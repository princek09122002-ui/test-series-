/** Marks private canonical imports whose difficulty has not received academic review. */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../src/lib/db";

const rows = await db.question.findMany({
  where: { importRecord: { isNot: null }, active: false, status: "PENDING", NOT: { tags: { has: "DIFFICULTY_UNRATED" } } },
  select: { id: true, tags: true },
});
mkdirSync(".local/backups", { recursive: true });
const backupPath = `.local/backups/pre-unrated-tag-${new Date().toISOString().replaceAll(":", "-")}.json`;
writeFileSync(backupPath, JSON.stringify(rows));
for (let index = 0; index < rows.length; index += 250) {
  const batch = rows.slice(index, index + 250);
  await db.$transaction(batch.map((row) => db.question.update({
    where: { id: row.id },
    data: { tags: [...new Set([...row.tags, "DIFFICULTY_UNRATED"])] },
  })));
}
console.log(JSON.stringify({ markedUnrated: rows.length, backupPath }));
await db.$disconnect();
