import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
// Every student selection path must use this gate, including availability counts.
export const eligibleBankWhere: Prisma.QuestionWhereInput = {
  active: true,
  status: "APPROVED",
  type: "SINGLE_CORRECT",
  OR: [
    {
      importRecord: { is: null },
      license: { in: ["ORIGINAL", "LICENSED", "PUBLIC_DOMAIN"] },
    },
    {
      importRecord: {
        is: {
          reviewStatus: "APPROVED",
          answerStatus: "VERIFIED",
          rightsStatus: "CLEARED",
          source: { is: {
            rightsStatus: "CLEARED",
            metadata: { path: ["permissionDecision", "authorizedScope"], equals: "STUDENT_TESTS" },
            OR: [
              {metadata:{path:['permissionDecision','evidenceOrigin'],equals:Prisma.AnyNull}},
              {metadata:{path:['permissionDecision','evidenceOrigin'],equals:'REVIEWED_SOURCE_PERMISSION'}},
            ],
          } },
          eligibility: "ELIGIBLE",
          eligibilityVersion: "NEET-2027-PROVISIONAL",
          type: "SINGLE_CORRECT",
          sourceOut: false,
        },
      },
    },
  ],
};
export async function importOverview() {
  return db.sourceDocument.findMany({
    orderBy: { title: "asc" },
    include: { jobs: true, _count: { select: { questions: true } } },
  });
}

// Called in the same transaction as saving a new review. Frozen test snapshots remain intact.
export async function invalidateImportApproval(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const record = await tx.sourceQuestion.findUniqueOrThrow({ where: { id } });
  const extracted = record.extracted as {
    answer?: string | null;
    processing?: { keySourceVerified?: boolean };
  };
  await tx.sourceQuestion.update({
    where: { id },
    data: {
      reviewStatus: "PENDING",
      rightsStatus: "UNVERIFIED",
      answerStatus: extracted.processing?.keySourceVerified
        ? "VERIFIED"
        : extracted.answer
          ? "SOURCE_MATCHED"
          : "REVIEW_REQUIRED",
    },
  });
  if (record.questionId)
    await tx.question.update({
      where: { id: record.questionId },
      data: { active: false, status: "PENDING" },
    });
}
