import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canonicalQuestionSchema,
  structuralIssues,
} from "@/lib/domain/canonical-question";
import { importCanonicalQuestion } from "@/lib/services/canonical-import";
import { QuestionContent } from "@/components/question-content";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function QuestionReview({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; chapter?: string }>;
}) {
  await requireStaff(false, true);
  const query = await searchParams;
  const pilotChapters = [
    ["Physics: Units and Measurements", "physics-school-11-1"],
    ["Chemistry: Structure of Atom", "chemistry-school-11-2"],
    ["Biology: Cell — The Unit of Life", "biology-school-11-8"],
  ] as const;
  const selectedChapter =
    pilotChapters.find(([, id]) => id === query.chapter)?.[1] ??
    pilotChapters[0][1];
  const record = await db.canonicalQuestionRecord.findFirst({
    where: query.id ? { questionId: query.id } : { chapterId: selectedChapter },
    orderBy: [{ questionId: "asc" }, { contentVersion: "desc" }],
  });
  if (!record)
    return (
      <p>
        No structured record imported yet.{" "}
        <Link href="/admin/extraction-review">
          Open source extraction queue
        </Link>
      </p>
    );
  const q = canonicalQuestionSchema.parse(record.document);
  const neighbors = await db.canonicalQuestionRecord.findMany({
    where: { chapterId: q.chapterId },
    distinct: ["questionId"],
    select: { questionId: true },
    orderBy: { questionId: "asc" },
  });
  const position = neighbors.findIndex((n) => n.questionId === q.id);
  async function save(form: FormData) {
    "use server";
    const user = await requireStaff();
    const parsed = canonicalQuestionSchema.parse(
      JSON.parse(String(form.get("document"))),
    );
    if (parsed.id !== q.id) throw Error("Question identity cannot change");
    parsed.contentVersion = q.contentVersion + 1;
    await db.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REQUEST_STRUCTURED_CONTENT_REVISION",
          entityId: q.id,
          metadata: {
            fromVersion: q.contentVersion,
            toVersion: parsed.contentVersion,
          },
        },
      });
    });
    await importCanonicalQuestion(parsed);
    redirect("/admin/question-review?id=" + q.id);
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Structured question review</h1>
      <nav aria-label="Pilot chapters" className="flex flex-wrap gap-4">
        {pilotChapters.map(([label,id])=><Link key={id} className="underline" href={'/admin/question-review?chapter='+id}>{label}</Link>)}
      </nav>
      <nav aria-label="Review sequence" className="flex gap-5">
        {position>0&&<Link href={'/admin/question-review?id='+neighbors[position-1].questionId}>Previous</Link>}
        <span>Question {position+1} of {neighbors.length}</span>
        {position+1<neighbors.length&&<Link href={'/admin/question-review?id='+neighbors[position+1].questionId}>Next</Link>}
      </nav>
      <p>
        {q.subject} · {q.source.paperVariant} · Q{q.source.questionNumber} · v
        {q.contentVersion}
      </p>
      <p className="break-all">
        ID: {q.id} · Chapter: {q.chapterId ?? "Unmapped"} · Topics:{" "}
        {q.primaryTopicIds.join(", ") || "Pending"} · Difficulty: {q.difficulty}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-semibold">Private source regions</h2>
          <QuestionContent blocks={q.reviewMedia} review />
        </section>
        <section>
          <h2 className="font-semibold">Structured presentation</h2>
          {q.presentation === "IMAGE_FALLBACK" && (
            <p className="rounded bg-amber-50 p-3 text-amber-900">
              Image presentation still requires review and authorized student
              media. Missing option text is shown explicitly.
            </p>
          )}
          <QuestionContent blocks={q.stem} />
          <fieldset className="space-y-3">
            <legend>Answer options preview</legend>
            {q.options.map((option) => (
              <label key={option.id} className="flex gap-3 rounded border p-3">
                <input
                  type="radio"
                  name={"preview-" + q.id}
                  value={option.id}
                />
                <span>
                  {option.label}.{" "}
                  {option.content.length ? (
                    <QuestionContent blocks={option.content} />
                  ) : (
                    <span>Missing source content — review required</span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
          <p className="mt-4">
            Extraction: {q.verification.extraction} · Answer:{" "}
            {q.verification.answer} · Academic: {q.verification.academic} ·
            Rights: {q.verification.rights} · Publication:{" "}
            {q.verification.publication}
          </p>
          <p>Technical issues: {structuralIssues(q).join(", ") || "None"}</p>
          <details>
            <summary>Answer-key provenance (staff only)</summary>
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(
                {
                  correctAnswerIds: q.correctAnswerIds,
                  evidence: q.source.answerEvidence,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      </div>
      <nav className="flex flex-wrap gap-4">
        <a className="underline" href={"/admin/extraction-review?id=" + q.id}>
          Correct extraction and compare media
        </a>
        <a className="underline" href={"/admin/imports/" + q.id}>
          Academic, answer and syllabus review
        </a>
        <a
          className="underline"
          href={"/admin/imports/sources/" + q.source.documentId}
        >
          Source licensing
        </a>
      </nav>
      <details>
        <summary>Edit content blocks as a new immutable revision</summary>
        <form action={save}>
          <textarea
            name="document"
            aria-label="Structured question JSON"
            defaultValue={JSON.stringify(q, null, 2)}
            className="min-h-96 w-full border p-3 font-mono text-xs"
          />
          <button className="rounded border p-3">
            Validate and save new private revision
          </button>
        </form>
      </details>
    </div>
  );
}
