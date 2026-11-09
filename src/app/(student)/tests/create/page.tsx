import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syllabusFor } from "@/lib/services/syllabus";
import { TestBuilder } from "@/components/test-builder";
import { EmptyState, PageHeading } from "@/components/shared";
import type { TestConfig } from "@/lib/domain/validation";
export default async function CreateTest({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; topic?: string }>;
}) {
  const user = await requireUser(true),
    syllabus = await syllabusFor(user.id),
    query = await searchParams;
  if (!syllabus)
    return (
      <EmptyState
        title="The syllabus is being prepared"
        description="An administrator needs to publish a syllabus and approved questions before testing is available."
      />
    );
  const kind = (
    [
      "CUSTOM",
      "PHYSICS_SECTION",
      "CHEMISTRY_SECTION",
      "BIOLOGY_SECTION",
      "CLASS_11",
      "CLASS_12",
      "FULL_MOCK",
      "WEAK",
      "COMPLETED",
    ].includes(query.kind ?? "")
      ? query.kind
      : "CUSTOM"
  ) as TestConfig["kind"];
  let preselect = query.topic ? [query.topic] : [];
  if (
    kind === "PHYSICS_SECTION" ||
    kind === "CHEMISTRY_SECTION" ||
    kind === "BIOLOGY_SECTION"
  )
    preselect = syllabus.subjects
      .filter(
        (s) =>
          s.name ===
          (kind === "BIOLOGY_SECTION"
            ? "Biology"
            : kind === "CHEMISTRY_SECTION"
              ? "Chemistry"
              : "Physics"),
      )
      .flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => t.id)));
  if (kind === "COMPLETED")
    preselect = syllabus.subjects.flatMap((s) =>
      s.chapters.flatMap((c) =>
        c.topics
          .filter((t) => ["COMPLETED", "REVISING"].includes(t.status))
          .map((t) => t.id),
      ),
    );
  if (kind === "WEAK")
    preselect = (
      await db.revisionTask.findMany({
        where: { userId: user.id, completedAt: null },
        select: { topicId: true },
      })
    ).map((t) => t.topicId);
  const blueprint = await db.examBlueprint.findFirst({
    where: { syllabusId: syllabus.id, active: true },
    include: { sections: { include: { subject: true } } },
    orderBy: { version: "desc" },
  });
  return (
    <>
      <PageHeading
        eyebrow="PRACTICE WITH INTENTION"
        title="Create your test"
        description="A whole chapter or a handful of concepts. Build a test that meets you where you are."
      />
      <TestBuilder
        developmentLab={process.env.NODE_ENV === "development"}
        syllabus={syllabus}
        preselect={preselect}
        initialKind={kind}
        language={(user.profile?.language ?? "en") as "en" | "hi"}
        blueprint={
          blueprint
            ? {
                totalQuestions: blueprint.totalQuestions,
                durationMinutes: blueprint.durationMinutes,
                sections: blueprint.sections.map((s) => ({
                  name: s.subject.name,
                  count: s.count,
                })),
              }
            : null
        }
      />
    </>
  );
}
