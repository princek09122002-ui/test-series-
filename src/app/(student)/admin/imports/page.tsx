import type { Prisma } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { importSubject } from "@/lib/domain/import-source";
import { eligibleBankWhere } from "@/lib/services/publication";
import { importReviewSchema, promoteImportedQuestion } from "@/lib/services/import-promotion";
import { PageHeading } from "@/components/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
type Filters = {
  subject?: string;
  category?: string;
  source?: string;
  year?: string;
  status?: string;
  rights?: string;
  eligibility?: string;
  page?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  answer?: string;
  classLevel?: string;
  published?: string;
  visual?: string;
  sourceOut?: string;
  questionType?: string;
  technical?: string;
  exception?: string;
  batchPublished?: string;
  batchSkipped?: string;
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  await requireStaff(false, true);
  async function publishBatch(form: FormData) {
    "use server";
    const reviewer = await requireStaff(true);
    const ids = [...new Set(form.getAll("questionId").map(String))];
    if (!ids.length || ids.length > 30) throw Error("Select up to 30 reviewed questions");
    let published = 0;
    const failures: string[] = [];
    for (const id of ids) {
      try {
        await db.$transaction(async (tx) => {
          const row = await tx.sourceQuestion.findUniqueOrThrow({ where: { id } });
          const review = importReviewSchema.parse(
            (row.suggestions as { reviewedForm?: unknown }).reviewedForm ?? row.suggestions,
          );
          await promoteImportedQuestion(tx, id, review, reviewer.id, "batch");
        });
        published++;
      } catch (error) {
        failures.push(id);
        await db.auditLog.create({
          data: { userId: reviewer.id, action: "IMPORT_BATCH_SKIP", entityId: id,
            metadata: { reason: error instanceof Error ? error.message.slice(0, 300) : "Unknown validation failure" } },
        });
      }
    }
    redirect("/admin/imports?batchPublished=" + published + "&batchSkipped=" + failures.length);
  }
  const q = await searchParams,
    page = Math.max(1, Number(q.page) || 1);
  const allSources = await db.sourceDocument.findMany({
    include: { jobs: true, _count: { select: { questions: true } } },
    orderBy: { title: "asc" },
  });
  const sources = allSources.filter(
    (s) => !q.subject || importSubject(s.metadata) === q.subject,
  );
  const chapters = await db.chapter.findMany({
    where: {
      active: true,
      subject: {
        name: { in: q.subject ? [q.subject] : ["Physics", "Chemistry", "Biology"] },
        syllabus: { active: true },
      },
    },
    include: { topics: { where: { active: true } }, subject: true },
    orderBy: [{ classLevel: "asc" }, { order: "asc" }],
  });
  const scope: Prisma.SourceQuestionWhereInput = {
    sourceId: { in: sources.map((s) => s.id) },
  };
  const extra: Prisma.SourceQuestionWhereInput[] = [scope];
  const chapterMatch = (id: string): Prisma.SourceQuestionWhereInput => ({
    OR: [
      { suggestions: { path: ["chapterId"], equals: id } },
      { suggestions: { path: ["candidateChapterIds"], array_contains: [id] } },
    ],
  });
  if (q.chapter) extra.push(chapterMatch(q.chapter));
  if (q.classLevel || q.category)
    extra.push({
      OR: chapters
        .filter(
          (c) =>
            (!q.classLevel || String(c.classLevel) === q.classLevel) &&
            (!q.category || c.classification === q.category),
        )
        .map((c) => chapterMatch(c.id)),
    });
  if (q.topic)
    extra.push({
      OR: [
        { suggestions: { path: ["topicIds"], array_contains: [q.topic] } },
        {
          suggestions: {
            path: ["candidates"],
            array_contains: [{ topicId: q.topic }],
          },
        },
      ],
    });
  if (q.difficulty)
    extra.push({ suggestions: { path: ["difficulty"], equals: q.difficulty } });
  if (q.technical)
    extra.push({ extracted: { path: ["processing", "textTechnicalReady"], equals: q.technical === "ready" } });
  if (q.exception === "yes")
    extra.push({ OR: [
      { answerStatus: { not: "VERIFIED" } },
      { extracted: { path: ["processing", "textTechnicalReady"], equals: false } },
      { sourceOut: true },
      { type: { not: "SINGLE_CORRECT" } },
    ] });
  const where: Prisma.SourceQuestionWhereInput = {
    AND: extra,
    ...(q.source ? { sourceId: q.source } : {}),
    ...(q.year && /^\d{4}$/.test(q.year) ? { year: Number(q.year) } : {}),
    ...(q.status ? { reviewStatus: q.status } : {}),
    ...(q.rights ? { rightsStatus: q.rights } : {}),
    ...(q.answer ? { answerStatus: q.answer } : {}),
    ...(q.questionType ? { type: q.questionType } : {}),
    ...(q.sourceOut === "yes" ? { sourceOut: true } : q.sourceOut === "no" ? { sourceOut: false } : {}),
    ...(q.visual === "yes"
      ? { extracted: { path: ["visual"], equals: true } }
      : q.visual === "no"
        ? { extracted: { path: ["visual"], equals: false } }
        : {}),
    ...(q.eligibility ? { eligibility: q.eligibility } : {}),
    ...(q.published === "yes"
      ? { question: { is: { active: true, status: "APPROVED" } } }
      : q.published === "no"
        ? {
            OR: [
              { questionId: null },
              { question: { is: { active: false } } },
              { question: { is: { status: { not: "APPROVED" } } } },
            ],
          }
        : {}),
  };
  const [rows, count, approved, published, stageRows, availableCounts] = await Promise.all([
    db.sourceQuestion.findMany({
      where,
      include: { source: true },
      take: 30,
      skip: (page - 1) * 30,
      orderBy: [{ sourceId: "asc" }, { sourceNumber: "asc" }],
    }),
    db.sourceQuestion.count({ where }),
    db.sourceQuestion.count({
      where: { AND: [scope, { reviewStatus: "APPROVED" }] },
    }),
    db.sourceQuestion.count({
      where: {
        AND: [
          scope,
          { question: { is: { active: true, status: "APPROVED" } } },
        ],
      },
    }),
    db.$queryRaw<Array<{
      subject: string; imported: bigint; parsed: bigint; answer_verified: bigint;
      topic_mapped: bigint; provisional_topic_links: bigint; canonical_drafts: bigint;
      content_validated: bigint; awaiting_academic: bigint;
      awaiting_rights: bigint; academic_approved: bigint; rights_cleared: bigint;
      published: bigint;
    }>>`
      select coalesce(d.metadata->>'subject','Physics') subject,
        count(*) imported,
        count(*) filter (where length(trim(coalesce(s.extracted->>'stem',''))) >= 10
          and jsonb_array_length(coalesce(s.extracted->'options','[]'::jsonb)) = 4) parsed,
        count(*) filter (where s."answerStatus"='VERIFIED') answer_verified,
        count(*) filter (where s."reviewEvidence" is not null
          and jsonb_array_length(coalesce(s.suggestions->'reviewedForm'->'topicIds',s.suggestions->'topicIds','[]'::jsonb)) > 0) topic_mapped,
        count(*) filter (where qu.id is not null and exists(select 1 from "QuestionTopic" qt where qt."questionId"=qu.id)) provisional_topic_links,
        count(*) filter (where qu.id is not null and qu.status='PENDING' and not qu.active) canonical_drafts,
        count(*) filter (where s.extracted->'processing'->>'textTechnicalReady'='true') content_validated,
        count(*) filter (where s."reviewStatus"='PENDING') awaiting_academic,
        count(*) filter (where s."rightsStatus" <> 'CLEARED' or d."rightsStatus" <> 'CLEARED') awaiting_rights,
        count(*) filter (where s."reviewStatus"='APPROVED') academic_approved,
        count(*) filter (where s."rightsStatus"='CLEARED' and d."rightsStatus"='CLEARED') rights_cleared,
        count(*) filter (where s."questionId" is not null and qu.active and qu.status='APPROVED') published
      from "SourceQuestion" s join "SourceDocument" d on d.id=s."sourceId"
      left join "Question" qu on qu.id=s."questionId"
      group by 1 order by 1`,
    Promise.all(["Physics", "Chemistry", "Biology"].map(async (subject) => ({
      subject,
      count: await db.question.count({
        where: {
          ...eligibleBankWhere,
          chapter: { active: true, subject: { name: subject, syllabus: { active: true } } },
          topics: { some: { required: false, topic: { active: true } } },
        },
      }),
    }))),
  ]);
  return (
    <>
      <PageHeading
        title="Question import review"
        description="Private Physics, Chemistry and Biology sources. Source-key matching is not academic approval. Publishing requires reviewed mapping, answer, eligibility, presentation and rights."
      />
      <p>
        {count} matching records · {approved} academically approved ·{" "}
        {published} published
      </p>
      {q.batchPublished && <p role="status" className="my-3 rounded-lg border p-3 text-sm">
        Batch published {q.batchPublished}; skipped {q.batchSkipped ?? 0}. Each skipped record and reason is in the audit log.
      </p>}
      <section className="my-5 overflow-x-auto rounded-xl border p-4">
        <h2 className="font-semibold">Import to test availability</h2>
        <p className="text-xs text-muted-foreground">Source-key verification and text validation are automated evidence checks. Academic approval and distribution rights require reviewer decisions.</p>
        <table className="mt-3 w-full text-sm">
          <thead><tr>{["Stage", "Physics", "Chemistry", "Biology"].map((x) => <th className="text-left p-2" key={x}>{x}</th>)}</tr></thead>
          <tbody>
            {[
              ["Imported", "imported"], ["Parsed", "parsed"], ["Answer verified from source page", "answer_verified"],
              ["Canonical private drafts", "canonical_drafts"],
              ["Provisional topic links", "provisional_topic_links"],
              ["Reviewed topic mapping", "topic_mapped"], ["Text technically validated", "content_validated"],
              ["Awaiting academic review", "awaiting_academic"], ["Awaiting source/question rights", "awaiting_rights"],
              ["Academically approved", "academic_approved"], ["Rights cleared", "rights_cleared"],
              ["Published", "published"],
            ].map(([label, key]) => <tr key={key} className="border-t"><th className="text-left p-2 font-normal">{label}</th>{["Physics", "Chemistry", "Biology"].map((subject) => <td className="p-2" key={subject}>{String(stageRows.find((r) => r.subject === subject)?.[key as keyof typeof stageRows[number]] ?? 0)}</td>)}</tr>)}
            <tr className="border-t font-semibold"><th className="text-left p-2">Available for tests</th>{["Physics", "Chemistry", "Biology"].map((subject) => <td className="p-2" key={subject}>{availableCounts.find((r) => r.subject === subject)?.count ?? 0}</td>)}</tr>
          </tbody>
        </table>
      </section>
      <details className="my-5 rounded-xl border p-4">
        <summary>Source files and import jobs</summary>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Subject / source</th>
              <th>Declared / stored</th>
              <th>Keys matched</th>
              <th>Job</th>
              <th>Rights</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link className="underline" href={"/admin/imports/sources/" + s.id}>{importSubject(s.metadata)} · {s.title}</Link>
                </td>
                <td>
                  {s.declaredCount} / {s._count.questions}
                </td>
                <td>
                  {String((s.metadata as { matched?: number }).matched ?? 0)}
                </td>
                <td>{s.jobs[0]?.status}</td>
                <td>{s.rightsStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <form className="flex flex-wrap gap-3 my-5">
        <select aria-label="Subject" name="subject" defaultValue={q.subject}>
          <option value="">All subjects</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Biology</option>
        </select>
        <select
          aria-label="Subject category"
          name="category"
          defaultValue={q.category}
        >
          <option value="">All categories</option>
          {[
            "Physical Chemistry",
            "Organic Chemistry",
            "Inorganic Chemistry",
            "Practical Chemistry",
            "Botany",
            "Zoology",
            "Mixed",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select name="classLevel" defaultValue={q.classLevel}>
          <option value="">Both classes</option>
          <option value="11">Class 11 mapping/candidates</option>
          <option value="12">Class 12 mapping/candidates</option>
        </select>
        <select name="chapter" defaultValue={q.chapter}>
          <option value="">All chapter mappings/candidates</option>
          {chapters.map((c) => (
            <option value={c.id} key={c.id}>
              {c.subject.name} · Class {c.classLevel} · {c.name}
            </option>
          ))}
        </select>
        <select name="topic" defaultValue={q.topic}>
          <option value="">All mapped/suggested topics</option>
          {chapters.map((c) => (
            <optgroup label={c.name} key={c.id}>
              {c.topics.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select name="difficulty" defaultValue={q.difficulty}>
          <option value="">All reviewed difficulties</option>
          {["EASY", "MEDIUM", "HARD"].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select name="answer" defaultValue={q.answer}>
          <option value="">All answer statuses</option>
          {["SOURCE_MATCHED", "REVIEW_REQUIRED", "VERIFIED"].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select name="source" defaultValue={q.source}>
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <input name="year" placeholder="Exam year" defaultValue={q.year} />
        {(
          [
            ["status", ["PENDING", "APPROVED", "REJECTED"]],
            ["rights", ["UNVERIFIED", "CLEARED"]],
            [
              "eligibility",
              ["UNVERIFIED", "ELIGIBLE", "OUT_OF_SYLLABUS", "INELIGIBLE"],
            ],
          ] as const
        ).map(([key, values]) => (
          <select key={key} name={key} defaultValue={q[key]}>
            <option value="">All {key}</option>
            {values.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
        <select name="published" defaultValue={q.published}>
          <option value="">All publication states</option>
          <option value="yes">Published</option>
          <option value="no">Unpublished</option>
        </select>
        <select name="questionType" defaultValue={q.questionType}>
          <option value="">All question types</option>
          <option value="SINGLE_CORRECT">Single correct</option>
          <option value="MULTIPLE_CORRECT">Multiple correct</option>
        </select>
        <select name="sourceOut" defaultValue={q.sourceOut}>
          <option value="">All source syllabus markings</option>
          <option value="yes">Source marked out of syllabus</option>
          <option value="no">Not source marked out</option>
        </select>
        <select name="visual" defaultValue={q.visual}>
          <option value="">All visual states</option>
          <option value="yes">Image or vector review</option>
          <option value="no">No detected image or vector</option>
        </select>
        <select name="technical" defaultValue={q.technical}>
          <option value="">All technical checks</option>
          <option value="ready">Text technically ready</option>
          <option value="blocked">Technical review required</option>
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="exception" value="yes" defaultChecked={q.exception === "yes"} /> Exceptions only</label>
        <button className="rounded-lg border px-4">Filter</button>
      </form>
      <form action={publishBatch} className="space-y-2">
        <p className="text-xs text-muted-foreground">Bulk publish checks saved academic reviews, PDF-key evidence, complete text, approved mapping, current eligibility and source/question rights. Only an admin can submit; failed rows stay private.</p>
        {rows.map((r) => {
          const processing = (r.extracted as { processing?: { textTechnicalReady?: boolean; blockers?: string[] } }).processing;
          return <div className="flex items-start gap-3 rounded-xl border p-4" key={r.id}>
            <input type="checkbox" name="questionId" value={r.id} aria-label={`Select ${r.source.title} Q${r.sourceNumber}`} />
            <Link className="block flex-1" href={"/admin/imports/" + r.id}>
              {importSubject(r.source.metadata)} · {r.source.title} · Q{r.sourceNumber} · {r.exam}
              <span className="block text-xs">
                {r.type} · answer {r.answerStatus} · academic {r.reviewStatus} · rights {r.rightsStatus} · eligibility {r.eligibility}
              </span>
              <span className="block text-xs text-muted-foreground">Text check: {processing?.textTechnicalReady ? "ready" : "review required"}{processing?.blockers?.length ? ` · ${processing.blockers.join(", ")}` : ""}</span>
            </Link>
          </div>;
        })}
        <button className="rounded-lg border px-4 py-2">Publish selected reviewed questions</button>
      </form>
      <div className="flex gap-4 mt-5">
        {page > 1 && (
          <Link
            href={"?" + new URLSearchParams({ ...q, page: String(page - 1) })}
          >
            Previous
          </Link>
        )}
        {page * 30 < count && (
          <Link
            href={"?" + new URLSearchParams({ ...q, page: String(page + 1) })}
          >
            Next
          </Link>
        )}
      </div>
    </>
  );
}
