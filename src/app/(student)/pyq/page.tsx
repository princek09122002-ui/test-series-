import { eligibleBankWhere } from "@/lib/services/publication";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { PyqBuilder } from "@/components/pyq-builder";
export default async function Page() {
  await requireUser(true);
  const chapters = await db.chapter.findMany({
    where: { active: true, subject: { syllabusId: "pyq-archive" } },
    select: {
      id: true,
      name: true,
      _count: {
        select: { questions: { where: eligibleBankWhere } },
      },
    },
    orderBy: { name: "asc" },
  });
  const papers = new Map<string, { id: string; name: string; count: number }>();
  for (const c of chapters) {
    const id = c.id.replace(/-(biology|chemistry|physics)$/, "");
    const p = papers.get(id) ?? { id, name: c.name.split(" · ")[0], count: 0 };
    p.count += c._count.questions;
    papers.set(id, p);
  }
  return (
    <>
      <PageHeading
        title="Previous-year paper practice"
        description="Practice questions from your uploaded papers. Complex questions retain the original question and options as an image. Topic mapping and difficulty ratings are pending; these are source-paper practice sets."
      />
      <Card className="max-w-2xl p-6">
        <PyqBuilder papers={[...papers.values()]} />
      </Card>
    </>
  );
}
