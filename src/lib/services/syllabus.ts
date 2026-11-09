import { eligibleBankWhere } from "./publication";
import { db } from "@/lib/db";
export async function syllabusFor(userId: string) {
  const version = await db.syllabusVersion.findFirst({
    where: { active: true },
    include: {
      subjects: {
        orderBy: { order: "asc" },
        include: {
          chapters: {
            where: { active: true },
            orderBy: [{ classLevel: "asc" }, { order: "asc" }],
            include: {
              _count: {
                select: {
                  questions: {
                    where: {
                      ...eligibleBankWhere,
                      topics: {
                        some: { required: false, topic: { active: true } },
                      },
                    },
                  },
                },
              },
              topics: {
                where: { active: true },
                orderBy: { order: "asc" },
                include: {
                  progress: { where: { userId }, select: { status: true } },
                  _count: {
                    select: {
                      questions: {
                        where: {
                          required: false,
                          question: {
                            ...eligibleBankWhere,
                            chapter: { active: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!version) return null;
  return {
    id: version.id,
    name: version.name,
    demo: version.demo,
    subjects: version.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      chapters: s.chapters.map((c) => ({
        id: c.id,
        name: c.name,
        classLevel: c.classLevel,
        classification: c.classification,
        questionCount: c._count.questions,
        topics: c.topics.map((t) => ({
          id: t.id,
          name: t.name,
          parentId: t.parentId,
          status: t.progress[0]?.status ?? "NOT_STARTED",
          questionCount: t._count.questions,
        })),
      })),
    })),
  };
}
export type SyllabusData = NonNullable<Awaited<ReturnType<typeof syllabusFor>>>;
