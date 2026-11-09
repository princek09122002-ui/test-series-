import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { importDirectory, importSubject } from "@/lib/domain/import-source";

export const importReviewSchema = z.object({
  text: z.string().trim().min(10),
  options: z.array(z.string().trim().min(1)).length(4).refine(
    (options) => new Set(options.map((o) => o.trim().toLowerCase())).size === 4,
    "Four distinct options are required",
  ),
  answer: z.number().int().min(0).max(3),
  chapterId: z.string().min(1),
  topicIds: z.array(z.string()).min(1),
  prerequisiteIds: z.array(z.string()).default([]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  eligibility: z.enum(["UNVERIFIED", "ELIGIBLE", "OUT_OF_SYLLABUS", "INELIGIBLE"]),
  rightsEvidence: z.string(),
  reviewEvidence: z.string(),
  renderMode: z.enum(["TEXT", "IMAGE"]),
  renderVerified: z.boolean(),
  duplicateChecked: z.boolean(),
});
export type ImportReview = z.infer<typeof importReviewSchema>;
const IMAGE_REQUIRED_FLAGS = new Set([
  "DIAGRAM_REFERENCE", "VISUAL_REFERENCE", "VISUAL_OR_FORMULA_REVIEW",
  "VECTOR_FORMULA_OR_STRUCTURE_REVIEW", "CHEMICAL_STRUCTURE_OR_FORMULA_REVIEW",
  "BIOLOGICAL_VISUAL_OR_GLYPH_REVIEW", "MULTILINE_OPTIONS_LAYOUT_REVIEW",
  "BIOLOGY_LAYOUT_REVIEW", "MULTIPLE_OPTION_GROUPS", "OPTIONS_NOT_FOUND",
  "EMPTY_OPTION", "NUMERIC_OPTION_LABELS_REVIEW_REQUIRED",
]);
export function requiresImagePresentation(extracted: { visual?: boolean; flags?: string[] }) {
  return !!extracted.visual || (extracted.flags ?? []).some((flag) => IMAGE_REQUIRED_FLAGS.has(flag));
}

export async function promoteImportedQuestion(
  tx: Prisma.TransactionClient,
  id: string,
  value: ImportReview,
  reviewerId: string,
  mode: "individual" | "batch" = "individual",
) {
  const v = importReviewSchema.parse(value);
  const record = await tx.sourceQuestion.findUniqueOrThrow({
    where: { id }, include: { source: true },
  });
  const subjectName = importSubject(record.source.metadata);
  const quality = record.extracted as { hybridVersions?: unknown[]; extractionReviews?: Array<{ decision: string; renderMode?: string; text?:string; options?:string[] }> };
  if (quality.hybridVersions?.length && quality.extractionReviews?.at(-1)?.decision !== "APPROVE_EXTRACTION")
    throw Error("The latest source extraction requires visual quality approval before publication");
  const permission = (record.source.metadata as Record<string, unknown>).permissionDecision as
    | { authorizedScope?: string; effectiveDate?: string; licenseType?: string; evidenceOrigin?:string }
    | undefined;
  if (
    record.source.rightsStatus !== "CLEARED" ||
    permission?.evidenceOrigin === 'OWNER_CHAT_DECLARATION' ||
    !record.source.rightsEvidence ||
    permission?.authorizedScope !== "STUDENT_TESTS" ||
    !["ORIGINAL", "LICENSED", "PUBLIC_DOMAIN"].includes(permission?.licenseType ?? "") ||
    !permission?.effectiveDate || new Date(permission.effectiveDate) > new Date()
  ) throw Error("Source distribution permission has not been established");
  if (
    v.eligibility !== "ELIGIBLE" ||
    v.rightsEvidence.trim().length < 20 ||
    v.reviewEvidence.trim().length < 20 ||
    !v.renderVerified || !v.duplicateChecked ||
    record.type !== "SINGLE_CORRECT" || record.sourceOut
  ) throw Error("Question answer, academic, rendering, duplicate, eligibility or rights review is incomplete");
  const extracted = record.extracted as {
    visual?: boolean;
    flags?: string[];
    processing?: { keySourceVerified?: boolean; textTechnicalReady?: boolean; keyPage?: number };
  };
  const processing = extracted.processing as
    | { keySourceVerified?: boolean; textTechnicalReady?: boolean }
    | undefined;
  const approvedExtraction=quality.extractionReviews?.at(-1);
  const approvedText=approvedExtraction?.decision==='APPROVE_EXTRACTION'&&approvedExtraction.renderMode==='TEXT';
  if(approvedText&&v.renderMode==='TEXT'&&(v.text!==approvedExtraction.text||JSON.stringify(v.options)!==JSON.stringify(approvedExtraction.options)))
    throw Error('Text or options differ from the approved extraction; repeat extraction review');
  const diagramRequired=!!extracted.visual||(extracted.flags??[]).includes('DIAGRAM_REFERENCE');
  const imageRequired = diagramRequired || (requiresImagePresentation(extracted)&&!approvedText);
  if (imageRequired && v.renderMode !== "IMAGE")
    throw Error("Diagram, structure or complex-layout questions require a reviewed image crop");
  if (v.renderMode === "TEXT" && !processing?.textTechnicalReady && !approvedText)
    throw Error("Plain-text publication requires a complete text and four-option validation");
  if (mode === "batch" && (
    record.answerStatus !== "VERIFIED" ||
    !processing?.keySourceVerified ||
    (!processing.textTechnicalReady && !approvedText) ||
    v.renderMode !== "TEXT"
  )) throw Error("Batch publication requires verified source key and complete plain text");
  const chapter = await tx.chapter.findFirstOrThrow({
    where: { id: v.chapterId, active: true, subject: { name: subjectName, syllabus: { active: true } } },
    include: { topics: true },
  });
  if (v.topicIds.some((topicId) => !chapter.topics.some((t) => t.id === topicId && t.active)))
    throw Error("Reviewed primary topics must belong to the active chapter");
  if ((await tx.topic.count({
    where: {
      id: { in: [...new Set(v.prerequisiteIds)] }, active: true,
      chapter: { active: true, subject: { name: subjectName, syllabus: { active: true } } },
    },
  })) !== new Set(v.prerequisiteIds).size) throw Error("Invalid prerequisites");
  const hash = createHash("sha256").update(v.text + "|" + v.options.join("|")).digest("hex");
  const duplicate = await tx.question.findFirst({
    where: { contentHash: hash, active: true, id: { not: id } }, select: { id: true },
  });
  if (duplicate) throw Error("Possible duplicate question: " + duplicate.id);
  if (v.renderMode === "IMAGE") {
    const from = importDirectory(subjectName) + "/approved-media/" + id + ".png";
    await readFile(from);
    await mkdir(".local/question-media", { recursive: true });
    await copyFile(from, ".local/question-media/" + id + ".png");
  }
  const old = await tx.question.findUnique({
    where: { id }, include: { options: true, topics: true, media: true },
  });
  if (old && record.questionId !== id)
    throw Error("Canonical question ID conflicts with an unrelated question");
  const changed = !!old && (
    old.contentHash !== hash || old.chapterId !== v.chapterId || old.correctOption !== v.answer ||
    old.difficulty !== v.difficulty ||
    old.topics.filter((t) => !t.required).map((t) => t.topicId).sort().join("|") !== [...v.topicIds].sort().join("|") ||
    old.topics.filter((t) => t.required).map((t) => t.topicId).sort().join("|") !== [...v.prerequisiteIds].filter((t) => !v.topicIds.includes(t)).sort().join("|")
  );
  if (changed && old) await tx.questionVersion.upsert({
    where: { questionId_version: { questionId: id, version: old.version } },
    create: { questionId: id, version: old.version, snapshot: {
      text: old.text, options: old.options.map((o) => o.text), correctOption: old.correctOption,
      chapterId: old.chapterId, topicIds: old.topics.filter((t) => !t.required).map((t) => t.topicId),
      prerequisiteIds: old.topics.filter((t) => t.required).map((t) => t.topicId),
      media: old.media.map((m) => m.url),
    } }, update: {},
  });
  const version = old ? old.version + Number(changed) : 1;
  const data = {
    structuredContent: {
      stem: v.renderMode === 'TEXT' ? [{type:'text',text:v.text}] : [{type:'image',url:'/api/question-media/'+id,alt:'Reviewed question and four options',visibility:'STUDENT',verified:true}],
      options: v.options.map((text,position)=>({id:id+':'+"ABCD"[position],label:"ABCD"[position],content:[{type:'text',text:v.renderMode==='TEXT'?text:`Option ${"ABCD"[position]} (shown above)`}]})),
    },
    text: v.renderMode === "TEXT" ? v.text : `${record.exam} · source Q${record.sourceNumber}`,
    chapterId: v.chapterId,
    correctOption: v.answer,
    explanation: "A reviewed worked solution is not available.",
    difficulty: v.difficulty,
    source: `${record.source.title} | ${record.exam} | Q${record.sourceNumber} | page ${record.page}`,
    license: permission.licenseType!,
    tags: ["PYQ", subjectName.toUpperCase() + "_IMPORT"],
    status: "APPROVED" as const,
    active: true,
    examYear: record.year,
    contentHash: hash,
    version,
  };
  await tx.question.upsert({ where: { id }, create: { id, ...data }, update: data });
  await tx.questionOption.deleteMany({ where: { questionId: id } });
  await tx.questionOption.createMany({
    data: v.options.map((text, position) => ({
      questionId: id, position,
      text: v.renderMode === "TEXT" ? text : `Option ${"ABCD"[position]} (shown above)`,
    })),
  });
  await tx.questionTopic.deleteMany({ where: { questionId: id } });
  await tx.questionTopic.createMany({
    data: [
      ...v.topicIds.map((topicId) => ({ questionId: id, topicId, required: false })),
      ...v.prerequisiteIds.filter((t) => !v.topicIds.includes(t)).map((topicId) => ({ questionId: id, topicId, required: true })),
    ],
  });
  await tx.questionMedia.deleteMany({ where: { questionId: id } });
  if (v.renderMode === "IMAGE") await tx.questionMedia.create({
    data: { questionId: id, url: "/api/question-media/" + id, alt: "Reviewed question and four options" },
  });
  await tx.sourceQuestion.update({
    where: { id }, data: {
      questionId: id, reviewStatus: "APPROVED", answerStatus: "VERIFIED",
      rightsStatus: "CLEARED", eligibility: "ELIGIBLE",
      rightsEvidence: v.rightsEvidence, reviewEvidence: v.reviewEvidence,
      suggestions: {
        ...(record.suggestions as Record<string, unknown>),
        reviewedForm: v,
      } as Prisma.InputJsonValue,
    },
  });
  await tx.questionVersion.upsert({
    where: { questionId_version: { questionId: id, version } },
    create: { questionId: id, version, snapshot: {
      text: data.text, options: v.options, correctOption: v.answer,
      chapterId: v.chapterId, topicIds: v.topicIds, prerequisiteIds: v.prerequisiteIds,
      sourceId: record.sourceId, sourcePage: record.page, sourceNumber: record.sourceNumber,
    } }, update: {},
  });
  await tx.auditLog.create({
    data: {
      userId: reviewerId, action: "IMPORT_PUBLISH_" + mode.toUpperCase(), entityId: id,
      metadata: { sourceId: record.sourceId, chapterId: v.chapterId, topicIds: v.topicIds,
        sourceKeyPage: processing?.keySourceVerified ? (record.extracted as { processing?: { keyPage?: number } }).processing?.keyPage : null,
        rightsDecision: permission, version },
    },
  });
  return { id, version, changed };
}
