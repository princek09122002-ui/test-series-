/** Read-only checks against the same Prisma service used by /api/tests/availability. */
import "dotenv/config";
import { db } from "../src/lib/db";
import { availability } from "../src/lib/services/testing";
import { testConfigSchema } from "../src/lib/domain/validation";

const user = await db.user.findFirst({ select: { id: true } });
if (!user) throw new Error("No existing user for exposure checks");
const config = testConfigSchema.parse({
  name: "Read-only live availability audit",
  kind: "CUSTOM",
  topicIds: [],
  fullChapterIds: [],
  count: 1,
  mode: "LEARNING",
  durationMinutes: null,
  difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
  exposure: "ALL",
  allocation: "AUTO",
  chapterCounts: {},
  language: "en",
});
const chapterIds = [
  ["Units and Measurements", "physics-school-11-1"],
  ["Motion in a Straight Line", "physics-school-11-2"],
  ["Current Electricity", "physics-school-12-3"],
  ["Some Basic Concepts of Chemistry", "chemistry-school-11-1"],
  ["Structure of Atom", "chemistry-school-11-2"],
  ["Electrochemistry", "chemistry-school-12-2"],
  ["Cell - The Unit of Life", "biology-school-11-8"],
  ["Molecular Basis of Inheritance", "biology-school-12-5"],
] as const;
const checks = [];
for (const [name, chapterId] of chapterIds) {
  const result = await availability(user.id, {
    ...config,
    fullChapterIds: [chapterId],
  });
  checks.push({ selection: name, chapterId, available: result.total });
}
for (const [name, topicId] of [
  ["Bohr's Model for Hydrogen Atom", "chemistry-school-11-2-t4"],
  ["Nernst Equation", "chemistry-school-12-2-t3"],
] as const) {
  const result = await availability(user.id, { ...config, topicIds: [topicId] });
  checks.push({ selection: name, topicId, available: result.total });
}
for (const [kind, count] of [
  ["PHYSICS_SECTION", 45],
  ["CHEMISTRY_SECTION", 45],
  ["BIOLOGY_SECTION", 90],
  ["FULL_MOCK", 180],
] as const) {
  const result = await availability(user.id, {
    ...config,
    kind,
    count,
    mode: "NEET",
    durationMinutes: kind === "FULL_MOCK" ? 180 : count,
  });
  checks.push({ selection: kind, requested: count, available: result.total, shortages: result.shortages });
}
console.log(JSON.stringify(checks, null, 2));
await db.$disconnect();
