import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { PageHeading } from "@/components/shared";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

const permissionSchema = z.object({
  decision: z.enum(["UNVERIFIED", "CLEARED", "RESTRICTED"]),
  licenseType: z.enum(["UNDETERMINED", "ORIGINAL", "LICENSED", "PUBLIC_DOMAIN", "RESTRICTED"]),
  authorizedScope: z.enum(["PRIVATE_REVIEW", "STUDENT_TESTS"]),
  documentationRef: z.string().trim().max(500),
  effectiveDate: z.string().trim(),
  evidence: z.string().trim().max(4000),
  rightsHolder: z.string().trim().max(300),
});

export default async function SourcePermissions({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(true, true);
  const { id } = await params;
  const source = await db.sourceDocument.findUnique({
    where: { id },
    include: { jobs: true, _count: { select: { questions: true } } },
  });
  if (!source) notFound();
  const metadata = source.metadata as Record<string, unknown>;
  const previous = (metadata.permissionDecision ?? {}) as Record<string, string>;

  async function save(form: FormData) {
    "use server";
    const reviewer = await requireStaff(true);
    const value = permissionSchema.parse(Object.fromEntries(form));
    const effective = value.effectiveDate ? new Date(value.effectiveDate) : null;
    if (effective && Number.isNaN(effective.getTime())) throw Error("Invalid effective date");
    if (value.decision === "CLEARED" && (
      !["ORIGINAL", "LICENSED", "PUBLIC_DOMAIN"].includes(value.licenseType) ||
      value.authorizedScope !== "STUDENT_TESTS" ||
      value.documentationRef.length < 10 ||
      value.evidence.length < 30 ||
      value.rightsHolder.length < 3 ||
      !effective || effective > new Date()
    )) throw Error("Clearing a source requires a supported license, student-test scope, documentation, effective date and detailed rights evidence");
    await db.$transaction(async (tx) => {
      const current = await tx.sourceDocument.findUniqueOrThrow({ where: { id } });
      const decision = {
        ...value,
        reviewerId: reviewer.id,
        decidedAt: new Date().toISOString(),
      };
      await tx.sourceDocument.update({
        where: { id },
        data: {
          rightsStatus: value.decision,
          rightsEvidence: value.decision === "CLEARED" ? value.evidence : null,
          metadata: {
            ...(current.metadata as Record<string, unknown>),
            permissionDecision: decision,
          } as Prisma.InputJsonValue,
        },
      });
      if (value.decision !== "CLEARED") {
        await tx.sourceQuestion.updateMany({
          where: { sourceId: id, rightsStatus: "CLEARED" },
          data: { rightsStatus: "UNVERIFIED" },
        });
        await tx.question.updateMany({
          where: { importRecord: { is: { sourceId: id } } },
          data: { active: false, status: "PENDING" },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: reviewer.id,
          action: "SOURCE_PERMISSION_" + value.decision,
          entityId: id,
          metadata: { decision, previousStatus: current.rightsStatus },
        },
      });
    });
    redirect("/admin/imports/sources/" + id);
  }

  return (
    <>
      <PageHeading title={source.title + " · source permissions"} description="Record actual authority to distribute this source to students. A cleared source still requires individual academic question review." />
      <p className="my-4 text-sm">{source.fileName} · {source._count.questions} staged questions · current decision: <strong>{source.rightsStatus}</strong></p>
      <p className="my-2 text-sm">Import jobs: {source.jobs.map((j) => `${j.version}: ${j.status}`).join(", ")}</p>
      <form action={save} className="space-y-4 max-w-3xl rounded-xl border p-5">
        <label className="field">Publication decision
          <select name="decision" defaultValue={source.rightsStatus}>
            <option value="UNVERIFIED">Unverified / private review</option>
            <option value="RESTRICTED">Restricted / no student distribution</option>
            <option value="CLEARED">Cleared for authorized scope</option>
          </select>
        </label>
        <label className="field">License or permission type
          <select name="licenseType" defaultValue={previous.licenseType ?? "UNDETERMINED"}>
            {[
              ["UNDETERMINED", "Undetermined"], ["ORIGINAL", "Independently authored"],
              ["LICENSED", "Licensed"], ["PUBLIC_DOMAIN", "Public domain"],
              ["RESTRICTED", "Restricted"],
            ].map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label className="field">Authorized usage scope
          <select name="authorizedScope" defaultValue={previous.authorizedScope ?? "PRIVATE_REVIEW"}>
            <option value="PRIVATE_REVIEW">Private editorial review only</option>
            <option value="STUDENT_TESTS">Student-facing question display and tests</option>
          </select>
        </label>
        <label className="field">Rights holder
          <input name="rightsHolder" defaultValue={previous.rightsHolder ?? ""} placeholder="Person or organization granting permission" />
        </label>
        <label className="field">Supporting document reference
          <input name="documentationRef" defaultValue={previous.documentationRef ?? ""} placeholder="License agreement ID, permission letter or official source" />
        </label>
        <label className="field">Effective date
          <input type="date" name="effectiveDate" defaultValue={previous.effectiveDate ?? ""} />
        </label>
        <label className="field">Rights evidence and limitations
          <textarea name="evidence" className="min-h-28" defaultValue={source.rightsEvidence ?? ""} />
        </label>
        <button className="rounded-lg border px-4 py-2">Save source permission decision</button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">A revoked or restricted decision immediately excludes its published questions from student availability and records the reviewer and time in the audit log.</p>
    </>
  );
}
