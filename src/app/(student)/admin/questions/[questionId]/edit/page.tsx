import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { questionInclude } from "@/lib/services/testing";
import { QuestionEditor } from "@/components/question-editor";
import { AdminAction } from "@/components/admin-controls";
import { PageHeading } from "@/components/shared";
export default async function EditQuestion({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const user = await requireStaff(false, true),
    { questionId } = await params,
    q = await db.question.findUnique({
      where: { id: questionId },
      include: questionInclude,
    });
  if (!q || (user.role !== "ADMIN" && q.authorId !== user.id)) notFound();
  const chapters = await db.chapter.findMany({
    where: {
      active: true,
      subject: { syllabusId: q.chapter.subject.syllabusId },
    },
    include: { subject: true, topics: { where: { active: true } } },
  });
  return (
    <>
      <PageHeading
        title="Edit question"
        description={`Version ${q.version} · ${q.status}. Saving changes creates a new draft version.`}
        action={
          <AdminAction
            data={{ action: "submitReview", id: q.id }}
            label="Submit for review"
          />
        }
      />
      <QuestionEditor
        id={q.id}
        chapters={chapters.map((c) => ({
          id: c.id,
          name: c.name,
          label: `${c.subject.name} · Class ${c.classLevel} · ${c.name}`,
        }))}
        topics={chapters.flatMap((c) =>
          c.topics.map((t) => ({ id: t.id, name: t.name, chapterId: c.id })),
        )}
        initial={{
          text: q.text,
          options: q.options.map((o) => o.text),
          correctOption: q.correctOption,
          explanation: q.explanation,
          chapterId: q.chapterId,
          topicIds: q.topics.filter((t) => !t.required).map((t) => t.topicId),
          prerequisiteIds: q.topics
            .filter((t) => t.required)
            .map((t) => t.topicId),
          difficulty: q.difficulty,
          language: q.language as "en" | "hi",
          source: q.source,
          license: q.license as "ORIGINAL" | "LICENSED" | "PUBLIC_DOMAIN",
          tags: q.tags,
          media: q.media.map((m) => ({ url: m.url, alt: m.alt })),
        }}
      />
    </>
  );
}
