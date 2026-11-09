import { afterAll, expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { promoteImportedQuestion } from "../../src/lib/services/import-promotion";
import { eligibleBankWhere } from "../../src/lib/services/publication";
import { availability } from "../../src/lib/services/testing";

if (process.env.TEST_DATABASE_READY !== "true" ||
  !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
  throw Error("Isolated database required");

afterAll(async () => db.$disconnect());

it("promotes only reviewed, source-authorized records and withdraws them on permission revocation", async () => {
  const id = crypto.randomUUID();
  const reviewer = await db.user.create({
    data: { email: `promotion-${id}@example.test`, role: "ADMIN" },
  });
  const chapter = await db.chapter.findFirstOrThrow({
    where: { active: true, subject: { name: "Physics", syllabus: { active: true } }, topics: { some: { active: true } } },
    include: { topics: true },
  });
  const topic = chapter.topics.find((t) => t.active)!;
  await db.sourceDocument.create({
    data: {
      id, sha256: id, fileName: "isolated-licensed-source.pdf", title: "Isolated source",
      pageCount: 1, declaredCount: 1, rightsStatus: "CLEARED",
      rightsEvidence: "Isolated test-only licensing evidence with student scope.",
      metadata: { subject: "Physics", permissionDecision: {
        authorizedScope: "STUDENT_TESTS", effectiveDate: "2020-01-01",
        licenseType: "LICENSED", documentationRef: "isolated-fixture-license",
      } },
    },
  });
  await db.sourceQuestion.create({
    data: {
      id, sourceId: id, sourceNumber: 1, year: 2024, exam: "ISOLATED FIXTURE",
      page: 1, type: "SINGLE_CORRECT", sourceOut: false, contentHash: id,
      answerStatus: "VERIFIED", extracted: { answer: "A", processing: {
        keySourceVerified: true, textTechnicalReady: true, keyPage: 1,
      } }, suggestions: {
        status: "UNREVIEWED", candidateChapterIds: [chapter.id],
        candidates: [{ chapterId: chapter.id, topicId: topic.id, score: 2 }],
      },
    },
  });
  const review = {
    text: "Independently authored isolated question for promotion testing?",
    options: ["First", "Second", "Third", "Fourth"], answer: 0,
    chapterId: chapter.id, topicIds: [topic.id], prerequisiteIds: [],
    difficulty: "EASY" as const, eligibility: "ELIGIBLE" as const,
    rightsEvidence: "Isolated fixture has explicit licensed student display rights.",
    reviewEvidence: "Isolated fixture answer and topic verified by the test reviewer.",
    renderMode: "TEXT" as const, renderVerified: true, duplicateChecked: true,
  };
  await db.sourceDocument.update({ where: { id }, data: { rightsStatus: "UNVERIFIED" } });
  await expect(db.$transaction((tx) => promoteImportedQuestion(tx, id, review, reviewer.id, "batch")))
    .rejects.toThrow("Source distribution permission");
  expect(await db.question.count({ where: { id } })).toBe(0);
  await db.sourceDocument.update({ where: { id }, data: { rightsStatus: "CLEARED" } });
  await db.sourceQuestion.update({where:{id},data:{extracted:{
    answer:'A',hybridVersions:[{version:'isolated-hybrid-fixture'}],
    processing:{keySourceVerified:true,textTechnicalReady:true,keyPage:1},
  }}});
  await expect(db.$transaction(tx=>promoteImportedQuestion(tx,id,review,reviewer.id,'individual')))
    .rejects.toThrow('visual quality approval');
  expect(await db.question.count({where:{id}})).toBe(0);
  await db.sourceQuestion.update({ where: { id }, data: { extracted: {
    answer: "A", visual: true, flags: ["DIAGRAM_REFERENCE"],
    processing: { keySourceVerified: true, textTechnicalReady: true, keyPage: 1 },
  } } });
  await expect(db.$transaction((tx) => promoteImportedQuestion(tx, id, review, reviewer.id, "individual")))
    .rejects.toThrow("reviewed image crop");
  await db.sourceQuestion.update({ where: { id }, data: { extracted: { answer: "A", visual: false,
    hybridVersions:[{version:'isolated-hybrid-fixture'}],
    extractionReviews:[{decision:'APPROVE_EXTRACTION',renderMode:'TEXT',text:review.text,options:review.options}],
    processing: { keySourceVerified: true, textTechnicalReady: false, keyPage: 1 } } } });
  await db.$transaction((tx) => promoteImportedQuestion(tx, id, review, reviewer.id, "batch"));
  await db.$transaction((tx) => promoteImportedQuestion(tx, id, review, reviewer.id, "batch"));
  expect(await db.question.count({ where: { id } })).toBe(1);
  expect(await db.questionOption.count({ where: { questionId: id } })).toBe(4);
  expect(await db.questionTopic.count({ where: { questionId: id } })).toBe(1);
  expect((await db.question.findUniqueOrThrow({ where: { id } })).version).toBe(1);
  expect(await db.sourceQuestion.findUniqueOrThrow({ where: { id } })).toMatchObject({
    suggestions: { status: "UNREVIEWED", candidateChapterIds: [chapter.id], reviewedForm: { topicIds: [topic.id] } },
  });
  expect(await db.question.count({ where: { AND: [eligibleBankWhere, { id }] } })).toBe(1);
  const shown = await availability(reviewer.id, {
    name: "Isolated promoted selection", kind: "CUSTOM", topicIds: [topic.id],
    fullChapterIds: [], count: 1, mode: "LEARNING", durationMinutes: null,
    difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 }, exposure: "ALL",
    allocation: "AUTO", chapterCounts: {}, language: "en", sourceFilter: "PYQ",
  });
  expect(shown.total).toBeGreaterThanOrEqual(1);
  const savedSource=await db.sourceDocument.findUniqueOrThrow({where:{id}});
  const metadata=savedSource.metadata as {subject:string;permissionDecision:Record<string,string>};
  await db.sourceDocument.update({where:{id},data:{metadata:{...metadata,permissionDecision:{...metadata.permissionDecision,evidenceOrigin:'OWNER_CHAT_DECLARATION'}}}});
  expect(await db.question.count({where:{AND:[eligibleBankWhere,{id}]}})).toBe(0);
  await expect(db.$transaction(tx=>promoteImportedQuestion(tx,id,review,reviewer.id,'batch'))).rejects.toThrow('distribution permission');
  await db.sourceDocument.update({where:{id},data:{metadata}});
  await db.sourceDocument.update({ where: { id }, data: { rightsStatus: "RESTRICTED" } });
  expect(await db.question.count({ where: { AND: [eligibleBankWhere, { id }] } })).toBe(0);
});
