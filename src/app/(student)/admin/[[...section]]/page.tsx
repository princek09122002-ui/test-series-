import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ClipboardCheck, Users, Flag } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { questionInclude } from "@/lib/services/testing";
import { PageHeading, Metric, EmptyState } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ScienceText } from "@/components/science-text";
import {
  AdminAction,
  AdminForm,
  BulkImport,
  JsonAdminForm,
  UserControls,
} from "@/components/admin-controls";
import { ChallengeForm } from "@/components/challenge-controls";
import type { Prisma } from "@/generated/prisma/client";
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireStaff(false, true),
    section = (await params).section?.join("/") ?? "overview",
    query = await searchParams;
  if (
    ![
      "overview",
      "questions",
      "review",
      "syllabus",
      "challenges",
      "users",
      "reports",
      "settings",
    ].includes(section)
  )
    notFound();
  if (!["overview", "questions"].includes(section))
    await requireStaff(true, true);
  if (section === "overview") {
    const [questions, pending, users, reports] = await Promise.all([
      db.question.count(),
      db.question.count({ where: { status: "PENDING" } }),
      user.role === "ADMIN" ? db.user.count() : Promise.resolve(0),
      db.questionReport.count({ where: { resolved: false } }),
    ]);
    const audit =
      user.role === "ADMIN"
        ? await db.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { user: { select: { name: true } } },
          })
        : [];
    return (
      <>
        <PageHeading
          eyebrow="CONTENT WORKSPACE"
          title="Build a better question bank"
          description="A reliable assessment starts with accurate questions and clear concept mappings."
          action={
            <Button asChild>
              <Link href="/admin/questions/new">Add a question →</Link>
            </Button>
          }
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric
            label="Question bank"
            value={questions}
            detail="Across all content states"
            icon={BookOpen}
          />
          <Metric
            label="Awaiting review"
            value={pending}
            detail="Not eligible for student tests"
            icon={ClipboardCheck}
          />
          <Metric
            label="Users"
            value={user.role === "ADMIN" ? users : "—"}
            detail={
              user.role === "ADMIN"
                ? "Registered accounts"
                : "Administrator access required"
            }
            icon={Users}
          />
          <Metric
            label="Open reports"
            value={reports}
            detail="Reported content issues"
            icon={Flag}
          />
        </div>
        {audit.length > 0 && (
          <Card className="mt-7">
            <CardHeader>
              <CardTitle>Recent administrative activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Entity</th>
                      <th>UTC timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td>{a.action}</td>
                        <td>{a.user.name}</td>
                        <td className="text-xs font-mono">{a.entityId}</td>
                        <td className="text-xs">{a.createdAt.toISOString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  }
  if (section === "questions") {
    const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
    const where: Prisma.QuestionWhereInput = {
      ...(query.q ? { text: { contains: query.q, mode: "insensitive" } } : {}),
      ...(["DRAFT", "PENDING", "APPROVED", "REJECTED", "ARCHIVED"].includes(
        query.status ?? "",
      )
        ? { status: query.status as "DRAFT" }
        : {}),
      ...(user.role !== "ADMIN" ? { authorId: user.id } : {}),
    };
    const [questions, count] = await Promise.all([
      db.question.findMany({
        where,
        include: { chapter: { include: { subject: true } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        skip: (page - 1) * 20,
      }),
      db.question.count({ where }),
    ]);
    return (
      <>
        <PageHeading
          title="Question bank"
          description="Create, version, review, and publish trustworthy assessment content."
          action={
            <Button asChild>
              <Link href="/admin/questions/new">Add a question →</Link>
            </Button>
          }
        />
        <form className="flex gap-3 mb-5">
          <Input
            name="q"
            placeholder="Search question text…"
            aria-label="Search question bank"
            defaultValue={query.q}
          />
          <Select
            className="w-44"
            name="status"
            aria-label="Publication status"
            defaultValue={query.status ?? ""}
          >
            <option value="">All statuses</option>
            {["DRAFT", "PENDING", "APPROVED", "REJECTED", "ARCHIVED"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </Select>
          <Button variant="outline">Search</Button>
        </form>
        <Card className="overflow-hidden">
          {questions.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Chapter</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id}>
                      <td className="min-w-72 max-w-md">
                        <p className="line-clamp-2">{q.text}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {q.difficulty} · {q.language}
                        </span>
                      </td>
                      <td className="text-xs">
                        {q.chapter.subject.name}
                        <br />
                        {q.chapter.name}
                      </td>
                      <td>
                        <Badge>{q.status}</Badge>
                      </td>
                      <td>v{q.version}</td>
                      <td>
                        <Link
                          href={`/admin/questions/${q.id}/edit`}
                          className="text-primary text-xs font-semibold"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No matching questions"
              description="Add an original question or adjust your search filters."
            />
          )}
        </Card>
        <div className="flex justify-between items-center text-xs mt-4 mb-8">
          <span>
            {count} matching records · Page {page}
          </span>
          <div className="flex gap-4">
            {page > 1 && (
              <Link
                className="text-primary"
                href={`/admin/questions?page=${page - 1}&q=${encodeURIComponent(query.q ?? "")}&status=${encodeURIComponent(query.status ?? "")}`}
              >
                Previous
              </Link>
            )}
            {page * 20 < count && (
              <Link
                className="text-primary"
                href={`/admin/questions?page=${page + 1}&q=${encodeURIComponent(query.q ?? "")}&status=${encodeURIComponent(query.status ?? "")}`}
              >
                Next
              </Link>
            )}
          </div>
        </div>
        {user.role === "ADMIN" && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk import</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkImport />
            </CardContent>
          </Card>
        )}
      </>
    );
  }
  if (section === "review") {
    const questions = await db.question.findMany({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      include: questionInclude,
      orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
      take: 30,
    });
    return (
      <>
        <PageHeading
          title="Content review"
          description="Check accuracy, rights, explanations, and topic prerequisites before publication. Approved content can be archived here."
        />
        <div className="space-y-5">
          {questions.length ? (
            questions.map((q) => (
              <Card key={q.id} className="p-6">
                <div className="flex justify-between gap-3 mb-4">
                  <p className="text-xs text-muted-foreground">
                    {q.chapter.subject.name} · {q.chapter.name} · v{q.version}
                  </p>
                  <Badge>{q.status}</Badge>
                </div>
                <ScienceText text={q.text} />
                <div className="my-4 grid sm:grid-cols-2 gap-3">
                  {q.options.map((o) => (
                    <div className="rounded-xl border p-3 text-sm" key={o.id}>
                      <strong>{String.fromCharCode(65 + o.position)}. </strong>
                      <ScienceText text={o.text} />
                      {o.position === q.correctOption && (
                        <Badge className="ml-3">CORRECT</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-secondary text-sm">
                  <ScienceText text={q.explanation} />
                </div>
                <p className="my-4 text-xs text-muted-foreground">
                  Primary topics:{" "}
                  {q.topics
                    .filter((t) => !t.required)
                    .map((t) => t.topic.name)
                    .join(", ")}
                  <br />
                  Prerequisites:{" "}
                  {q.topics
                    .filter((t) => t.required)
                    .map((t) => t.topic.name)
                    .join(", ") || "None explicitly mapped"}
                  <br />
                  Rights: {q.license} · {q.source}
                </p>
                <div className="flex flex-wrap gap-2">
                  <AdminAction
                    label="Approve & publish"
                    variant="default"
                    data={{
                      action: "reviewQuestion",
                      id: q.id,
                      status: "APPROVED",
                      notes: "Reviewed by administrator",
                    }}
                  />
                  <AdminAction
                    label="Reject"
                    data={{
                      action: "reviewQuestion",
                      id: q.id,
                      status: "REJECTED",
                      notes: "Returned for revision",
                    }}
                  />
                  <AdminAction
                    label="Archive / unpublish"
                    data={{
                      action: "reviewQuestion",
                      id: q.id,
                      status: "ARCHIVED",
                      notes: "Removed from future test generation",
                    }}
                  />
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/questions/${q.id}/edit`}>
                      Edit question
                    </Link>
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState
                title="The review queue is clear"
                description="Submit draft questions for review from their edit screen."
              />
            </Card>
          )}
        </div>
      </>
    );
  }
  if (section === "syllabus") {
    const versions = await db.syllabusVersion.findMany({
      include: {
        subjects: {
          include: {
            chapters: { include: { topics: true } },
          },
        },
      },
      orderBy: { year: "desc" },
    });
    const coverageRows = await db.questionTopic.groupBy({
      by: ["topicId"],
      where: {
        required: false,
        question: { status: "APPROVED", active: true },
      },
      _count: { questionId: true },
    });
    const coverage = new Map(
      coverageRows.map((t) => [t.topicId, t._count.questionId]),
    );
    const subjects = versions.flatMap((v) =>
        v.subjects.map((s) => ({ ...s, version: v.name })),
      ),
      chapters = subjects.flatMap((s) =>
        s.chapters.map((c) => ({ ...c, subject: s.name, version: s.version })),
      );
    return (
      <>
        <PageHeading
          title="Syllabus & coverage"
          description="Use versioned subjects, class mappings, chapters, and concepts. Active versions drive new tests; historical attempts keep their snapshots."
        />
        <div className="space-y-4 mb-7">
          {versions.map((v) => (
            <Card
              key={v.id}
              className="p-5 flex flex-wrap justify-between items-center gap-3"
            >
              <div>
                <h2 className="font-semibold">{v.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {v.year} ·{" "}
                  {v.demo ? "Illustrative coverage" : "Published taxonomy"} ·{" "}
                  {v.subjects.length} subjects
                </p>
                <code className="text-[10px] text-muted-foreground">
                  {v.id}
                </code>
              </div>
              {v.active ? (
                <Badge>ACTIVE VERSION</Badge>
              ) : (
                <AdminAction
                  label="Activate syllabus"
                  data={{ action: "activateVersion", id: v.id }}
                />
              )}
            </Card>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Create a syllabus version</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminForm
                action="createVersion"
                hidden={{ demo: false }}
                fields={[
                  { name: "name", label: "Version name" },
                  {
                    name: "year",
                    label: "Exam year",
                    type: "number",
                    value: "2027",
                  },
                  {
                    name: "sourceUrl",
                    label: "Authoritative source URL",
                    type: "url",
                  },
                ]}
                label="Create inactive version"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add a subject</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminForm
                action="addSubject"
                fields={[
                  {
                    name: "syllabusId",
                    label: "Syllabus version",
                    options: versions.map((v) => ({
                      value: v.id,
                      label: v.name,
                    })),
                  },
                  {
                    name: "name",
                    label: "Subject",
                    options: ["Physics", "Chemistry", "Biology"].map((n) => ({
                      value: n,
                      label: n,
                    })),
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add a chapter</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminForm
                action="addChapter"
                fields={[
                  {
                    name: "subjectId",
                    label: "Subject & version",
                    options: subjects.map((s) => ({
                      value: s.id,
                      label: `${s.name} · ${s.version}`,
                    })),
                  },
                  { name: "name", label: "Chapter name" },
                  {
                    name: "classLevel",
                    label: "Class",
                    type: "number",
                    options: [
                      { value: "11", label: "11" },
                      { value: "12", label: "12" },
                    ],
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add a topic</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminForm
                action="addTopic"
                fields={[
                  {
                    name: "chapterId",
                    label: "Chapter",
                    options: chapters.map((c) => ({
                      value: c.id,
                      label: `${c.subject} · Class ${c.classLevel} · ${c.name}`,
                    })),
                  },
                  { name: "name", label: "Topic name" },
                  { name: "ncertRef", label: "NCERT reference" },
                ]}
              />
            </CardContent>
          </Card>
        </div>
        <Card className="mt-7 overflow-hidden">
          <CardHeader>
            <CardTitle>Question coverage by topic</CardTitle>
            <p className="text-xs text-muted-foreground">
              Mapped approved content. Strict eligible counts can be lower after
              prerequisite, exposure, and difficulty constraints.
            </p>
          </CardHeader>
          <div className="overflow-x-auto max-h-[650px]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Chapter</th>
                  <th>Approved mappings</th>
                  <th>ID for import</th>
                </tr>
              </thead>
              <tbody>
                {chapters.flatMap((c) =>
                  c.topics.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td className="text-xs">
                        {c.subject} · {c.name}
                      </td>
                      <td>{coverage.get(t.id) ?? 0}</td>
                      <td className="text-[10px] font-mono">{t.id}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    );
  }
  if (section === "users") {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, email: true, role: true, disabled: true },
    });
    return (
      <>
        <PageHeading
          title="Users & permissions"
          description="Manage account roles and access. Permission changes invalidate existing sessions."
        />
        <Card className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.id === user.id ? (
                      <Badge>YOUR ADMINISTRATOR ACCOUNT</Badge>
                    ) : (
                      <UserControls
                        id={u.id}
                        role={u.role}
                        disabled={u.disabled}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-4 text-xs text-muted-foreground">
          Showing the 100 most recently created accounts.
        </p>
      </>
    );
  }
  if (section === "reports") {
    const reports = await db.questionReport.findMany({
      include: {
        question: { select: { text: true } },
        user: { select: { name: true } },
      },
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return (
      <>
        <PageHeading
          title="Question reports"
          description="Resolve content issues and record the action taken. Corrected question versions apply to future tests."
        />
        <div className="space-y-4">
          {reports.length ? (
            reports.map((r) => (
              <Card key={r.id} className="p-6">
                <Badge>{r.resolved ? "RESOLVED" : "OPEN REPORT"}</Badge>
                <p className="mt-4 text-sm font-medium">{r.question.text}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {r.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Reported by {r.user.name} · {r.createdAt.toISOString()}
                </p>
                <Link
                  className="block text-xs text-primary my-4"
                  href={`/admin/questions/${r.questionId}/edit`}
                >
                  Review and edit question →
                </Link>
                {r.resolved ? (
                  <p className="text-sm">Resolution: {r.resolution}</p>
                ) : (
                  <AdminForm
                    action="resolveReport"
                    hidden={{ id: r.id }}
                    fields={[
                      {
                        name: "resolution",
                        label: "Resolution notes",
                        type: "textarea",
                      },
                    ]}
                    label="Resolve report"
                  />
                )}
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState
                title="No content reports"
                description="Student reports will appear here for review."
              />
            </Card>
          )}
        </div>
      </>
    );
  }
  if (section === "challenges") {
    const [tests, challenges] = await Promise.all([
      db.test.findMany({
        where: {
          attempts: { some: { userId: user.id } },
          configuration: { mode: "NEET", durationSeconds: { not: null } },
          challenge: null,
        },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.challenge.findMany({ orderBy: { startsAt: "desc" }, take: 50 }),
    ]);
    return (
      <>
        <PageHeading
          title="Standardized challenges"
          description="Create a common-paper challenge from one of your own timed NEET-style tests."
        />
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create a challenge</CardTitle>
            </CardHeader>
            <CardContent>
              {!tests.length && (
                <p className="text-sm text-muted-foreground mb-5">
                  First create a timed NEET-style test in the student builder.
                  It becomes the source for the frozen common paper.
                </p>
              )}
              <ChallengeForm tests={tests} />
            </CardContent>
          </Card>
          <div className="space-y-4">
            {challenges.map((c) => (
              <Card className="p-5" key={c.id}>
                <h2 className="font-semibold">{c.name}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.startsAt.toISOString()} – {c.endsAt.toISOString()}
                </p>
                <p className="text-xs mt-3">
                  {c.public ? "Public challenge" : "Private invite only"} ·{" "}
                  {c.published ? "Published" : "Unpublished"}
                </p>
                <Link
                  className="block text-xs mt-4 text-primary break-all"
                  href={`/challenges/${c.id}${c.public ? "" : `?invite=${c.inviteCode}`}`}
                >
                  {c.public
                    ? "View challenge →"
                    : "Open private invitation link →"}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }
  const [syllabus, intervals, blueprints] = await Promise.all([
    db.syllabusVersion.findFirst({
      where: { active: true },
      include: { subjects: true },
    }),
    db.platformSettings.findUnique({ where: { key: "revisionIntervals" } }),
    db.examBlueprint.findMany({
      include: { sections: { include: { subject: true } } },
      orderBy: { version: "desc" },
    }),
  ]);
  return (
    <>
      <PageHeading
        title="Platform settings"
        description="Version exam blueprints and keep learning heuristics transparent and configurable."
      />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revision intervals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Days to the next review at each stage. Must be non-decreasing.
              Changing this affects future scheduling decisions.
            </p>
            <JsonAdminForm
              action="revisionSettings"
              initial={{ intervals: intervals?.value ?? [0, 3, 7, 14] }}
              label="Save revision intervals"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Create a new blueprint version</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Section counts must add to the total. Prior versions and attempt
              scoring snapshots are retained.
            </p>
            <JsonAdminForm
              action="createBlueprint"
              initial={{
                name: "NEET reference blueprint",
                syllabusId: syllabus?.id ?? "",
                totalQuestions: 180,
                durationMinutes: 180,
                sections:
                  syllabus?.subjects.map((s) => ({
                    subjectId: s.id,
                    count: s.name === "Biology" ? 90 : 45,
                  })) ?? [],
              }}
              label="Publish blueprint version"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Explicit historical rescore</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              First correct and reapprove the question bank version. This action
              explicitly rescores submitted attempts of an affected historical
              version and retains prior keys, scores, and analytics in the audit
              log. Active attempts must finish first. Correct option uses 0=A
              through 3=D.
            </p>
            <JsonAdminForm
              action="rescoreQuestion"
              initial={{
                questionId: "",
                version: 1,
                correctOption: 0,
                reason:
                  "Describe the verified content defect and correction here",
              }}
              label="Apply audited historical correction"
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Configured exam patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {blueprints.map((b) => (
                <div key={b.id} className="rounded-xl bg-background p-4">
                  <p className="font-semibold text-sm">
                    {b.name} · v{b.version} {b.active ? "· Active" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {b.totalQuestions} questions · {b.durationMinutes} minutes ·{" "}
                    {b.sections
                      .map((s) => `${s.subject.name}: ${s.count}`)
                      .join(" / ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Correct {b.correctMarks} · Incorrect {b.incorrectMarks} ·
                    Unanswered {b.unansweredMarks}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
