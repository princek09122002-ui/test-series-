import { importSubject } from "@/lib/domain/import-source";
import { importReviewSchema, promoteImportedQuestion, requiresImagePresentation } from "@/lib/services/import-promotion";
import { invalidateImportApproval } from "@/lib/services/publication";
/* eslint-disable @next/next/no-img-element -- Authenticated private evidence must not pass through a public image optimizer. */
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { PageHeading } from "@/components/shared";
import type { Prisma } from "@/generated/prisma/client";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff(false, true);
  const { id } = await params;
  const row = await db.sourceQuestion.findUnique({
    where: { id },
    include: { source: true },
  });
  if (!row) notFound();
  const subjectName = importSubject(row.source.metadata);
  const ownerDeclarationOnly=(row.source.metadata as {permissionDecision?:{evidenceOrigin?:string}}).permissionDecision?.evidenceOrigin==='OWNER_CHAT_DECLARATION';
  const e = row.extracted as {
    stem: string;
    options: string[];
    answer: string | null;
    visual?: boolean;
    flags: string[];
    answerEvidence: unknown;
    processing?: { textTechnicalReady?: boolean; blockers?: string[]; keyPage?: number };
  };
  const extractionReview=(row.extracted as {extractionReviews?:Array<{decision:string;text:string;options:string[];renderMode?:string}>}).extractionReviews?.at(-1);
  if(extractionReview?.decision==='APPROVE_EXTRACTION'){
    if(extractionReview.renderMode==='TEXT'){
      e.stem=extractionReview.text;
      e.options=extractionReview.options;
    } else {
      e.options=['A','B','C','D'].map(label=>`Option ${label} (shown in reviewed image)`);
    }
  }
  const chapters = await db.chapter.findMany({
    where: {
      active: true,
      subject: { name: subjectName, syllabus: { active: true } },
    },
    include: { topics: { where: { active: true } } },
  });
  async function review(form: FormData) {
    "use server";
    const user = await requireStaff(true);
    const action = String(form.get("action"));
    const record = await db.sourceQuestion.findUniqueOrThrow({
      where: { id },
      include: { source: true },
    });
    if (action === "reject") {
      await db.$transaction(async (tx) => {
        await tx.sourceQuestion.update({
          where: { id },
          data: { reviewStatus: "REJECTED" },
        });
        if (record.questionId)
          await tx.question.update({
            where: { id: record.questionId },
            data: { active: false, status: "REJECTED" },
          });
      });
      redirect("/admin/imports/" + id);
    }
    const v = importReviewSchema.parse({
      text: form.get("text"),
      options: [0, 1, 2, 3].map((i) => form.get("option" + i)),
      answer: form.get("answer") === "" ? null : Number(form.get("answer")),
      chapterId: form.get("chapterId"),
      topicIds: form.getAll("topicIds"),
      prerequisiteIds: form.getAll("prerequisiteIds"),
      difficulty: form.get("difficulty"),
      eligibility: form.get("eligibility"),
      rightsEvidence: form.get("rightsEvidence"),
      reviewEvidence: form.get("reviewEvidence"),
      renderMode: form.get("renderMode"),
      renderVerified: form.get("renderVerified") === "on",
      duplicateChecked: form.get("duplicateChecked") === "on",
    });
    const chapter = await db.chapter.findFirstOrThrow({
      where: {
        id: v.chapterId,
        active: true,
        subject: { name: subjectName, syllabus: { active: true } },
      },
      include: { topics: true },
    });
    if (
      v.topicIds.some(
        (t) => !chapter.topics.some((x) => x.id === t && x.active),
      )
    )
      throw Error("Primary topics must belong to the reviewed chapter");
    if (
      (await db.topic.count({
        where: {
          id: { in: v.prerequisiteIds },
          active: true,
          chapter: {
            active: true,
            subject: { name: subjectName, syllabus: { active: true } },
          },
        },
      })) !== new Set(v.prerequisiteIds).size
    )
      throw Error("Invalid prerequisites");
    if (action === "publish") {
      await db.$transaction(async (tx) => {
        await promoteImportedQuestion(tx, id, v, user.id, "individual");
      });
    } else {
      await db.$transaction(async (tx) => {
        await tx.sourceQuestion.update({
          where: { id },
          data: {
            reviewEvidence: v.reviewEvidence,
            rightsEvidence: v.rightsEvidence,
            eligibility: v.eligibility,
            suggestions: {
              ...(record.suggestions as Record<string, unknown>),
              reviewedForm: v,
            } as Prisma.InputJsonValue,
          },
        });
        await invalidateImportApproval(tx, id);
        await tx.auditLog.create({
          data: { userId: user.id, action: "IMPORT_SAVE", entityId: id,
            metadata: { evidence: v.reviewEvidence } },
        });
      });
    }
    redirect("/admin/imports/" + id);
  }
  const saved = importReviewSchema.safeParse(
    (row.suggestions as { reviewedForm?: unknown }).reviewedForm ?? row.suggestions,
  );
  const proposed = row.suggestions as {
    candidateChapterIds?: string[];
    candidates?: Array<{ chapterId: string; topicId: string; score: number }>;
    provisionalDifficulty?: "EASY" | "MEDIUM" | "HARD";
  };
  const candidateChapterId = proposed.candidateChapterIds?.length === 1
    ? proposed.candidateChapterIds[0] : "";
  const ranked = (proposed.candidates ?? [])
    .filter((c) => c.chapterId === candidateChapterId && c.score >= 2)
    .sort((a, b) => b.score - a.score);
  const candidateTopicIds = ranked.length && (!ranked[1] || ranked[0].score > ranked[1].score)
    ? [ranked[0].topicId] : [];
  const initial = saved.success
    ? saved.data
    : {
        text: e.stem,
        options: e.options,
        answer:
          e.answer && /^[A-D]$/.test(e.answer)
            ? "ABCD".indexOf(e.answer)
            : null,
        chapterId: candidateChapterId,
        topicIds: candidateTopicIds,
        prerequisiteIds: [],
        difficulty: proposed.provisionalDifficulty ?? "",
        eligibility: "UNVERIFIED",
        rightsEvidence: "",
        reviewEvidence: "",
        renderMode: extractionReview?.decision==='APPROVE_EXTRACTION'&&extractionReview.renderMode==='TEXT' ? 'TEXT' : e.processing?.textTechnicalReady && !requiresImagePresentation(e) ? "TEXT" : "IMAGE",
        renderVerified: false,
        duplicateChecked: false,
      };
  return (
    <>
      <PageHeading
        title={row.source.title + " · Q" + row.sourceNumber}
        description={row.exam + " · PDF page " + row.page + " · PRIVATE REVIEW"}
      />
      <p className="my-3 text-sm">
        Source rights: {ownerDeclarationOnly?'Owner declaration retained; authorization documentation review pending':row.source.rightsStatus}. Review the source permission
        decision at <a className="underline" href={"/admin/imports/sources/" + row.sourceId}>source permissions</a> before publishing.
      </p>
      <p>{e.flags.join(" · ")}</p>
      {requiresImagePresentation(e) && (
        <p className="my-2 text-sm font-semibold">
          This question requires an image crop of the question and all four options. Review the prepared crop before publishing.
        </p>
      )}
      <p className="my-2 text-xs text-muted-foreground">Suggested chapter/topic and answer are prefilled only to speed review. Compare the source image, options, scientific notation and key page, then record your own academic decision. Technical blockers: {e.processing?.blockers?.join(", ") || "none detected"}.</p>
      <img
        src={"/api/admin/import-media/" + id}
        alt="Original source evidence"
        className="w-full max-w-4xl my-5"
      />
      <p className="my-3">
        <a href={"/api/admin/import-media/" + id + "?presentation=1"}>
          Preview prepared presentation crop (after preparation)
        </a>
      </p>
      <details>
        <summary>Source key evidence and mapping suggestions</summary>
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(
            { key: e.answerEvidence, suggestions: row.suggestions },
            null,
            2,
          )}
        </pre>
      </details>
      <form action={review} className="space-y-4 mt-6">
        <label className="field">
          Reviewed question text
          <textarea
            name="text"
            className="border rounded-xl p-3 min-h-28"
            defaultValue={initial.text}
          />
        </label>
        {initial.options.map((option, i) => (
          <label className="field" key={i}>
            Option {"ABCD"[i]}
            <textarea
              name={"option" + i}
              className="border rounded-lg p-2"
              defaultValue={option}
            />
          </label>
        ))}
        <label className="field">
          Verified answer
          <select name="answer" defaultValue={initial.answer ?? ""}>
            <option value="">Not verified</option>
            {[0, 1, 2, 3].map((i) => (
              <option key={i} value={i}>
                {"ABCD"[i]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Chapter
          <select name="chapterId" defaultValue={initial.chapterId}>
            <option value="">Select reviewed chapter</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                Class {c.classLevel} · {c.name}
              </option>
            ))}
          </select>
        </label>
        {["topicIds", "prerequisiteIds"].map((field) => (
          <label className="field" key={field}>
            {field === "topicIds"
              ? "Required topics within the selected chapter"
              : "Additional prerequisite topics (optional)"}
            <select
              multiple
              name={field}
              size={8}
              defaultValue={initial[field as "topicIds"]}
              className="border rounded-lg p-2"
            >
              {chapters.map((c) => (
                <optgroup label={c.name} key={c.id}>
                  {c.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ))}
        <label className="field">
          Reviewed difficulty
          <select name="difficulty" defaultValue={initial.difficulty}>
            <option value="">Unrated</option>
            {["EASY", "MEDIUM", "HARD"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="field">
          NEET eligibility (provisional 2027 configuration)
          <select name="eligibility" defaultValue={initial.eligibility}>
            {["UNVERIFIED", "ELIGIBLE", "OUT_OF_SYLLABUS", "INELIGIBLE"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
        <label className="field">
          Publication-rights evidence
          <textarea
            name="rightsEvidence"
            className="border rounded-lg p-2"
            defaultValue={initial.rightsEvidence}
          />
        </label>
        <label className="field">
          Academic review evidence: answer, mapping, prerequisites and
          eligibility
          <textarea
            name="reviewEvidence"
            className="border rounded-lg p-2"
            defaultValue={initial.reviewEvidence}
          />
        </label>
        <label className="field">
          Presentation
          <select name="renderMode" defaultValue={initial.renderMode}>
            <option value="IMAGE">Reviewed question image</option>
            <option value="TEXT">Reviewed text and options</option>
          </select>
        </label>
        <label className="block">
          <input
            name="renderVerified"
            type="checkbox"
            defaultChecked={initial.renderVerified}
          />{" "}
          I verified every symbol and option in the final presentation.
        </label>
        <label className="block">
          <input
            name="duplicateChecked"
            type="checkbox"
            defaultChecked={initial.duplicateChecked}
          />{" "}
          I checked for duplicate questions and source occurrences.
        </label>
        <p className="text-sm">
          Image publication requires a separately reviewed crop without the
          solution QR/link. No worked solution is published by this action.
          Source-marked exclusions and multiple-correct records remain private.
        </p>
        <div className="flex gap-4">
          {["save", "publish", "reject"].map((action) => (
            <button
              key={action}
              name="action"
              value={action}
              disabled={action === "publish" && (row.source.rightsStatus !== "CLEARED" || ownerDeclarationOnly)}
              className="border rounded-lg p-3"
            >
              {action === "publish"
                ? "Approve and publish"
                : action === "save"
                  ? "Save review"
                  : "Reject"}
            </button>
          ))}
        </div>
      </form>
    </>
  );
}
