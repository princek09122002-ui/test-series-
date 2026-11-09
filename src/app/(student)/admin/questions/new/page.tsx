import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/question-editor";
import { PageHeading } from "@/components/shared";
export default async function NewQuestion() {
  await requireStaff(false, true);
  const chapters = await db.chapter.findMany({
    where: { active: true, subject: { syllabus: { active: true } } },
    include: { subject: true, topics: { where: { active: true } } },
  });
  return (
    <>
      <PageHeading
        title="Create a question"
        description="Map the concepts, explain the answer, and submit your draft for review."
      />
      <QuestionEditor
        chapters={chapters.map((c) => ({
          id: c.id,
          name: c.name,
          label: `${c.subject.name} · Class ${c.classLevel} · ${c.name}`,
        }))}
        topics={chapters.flatMap((c) =>
          c.topics.map((t) => ({ id: t.id, name: t.name, chapterId: c.id })),
        )}
      />
    </>
  );
}
