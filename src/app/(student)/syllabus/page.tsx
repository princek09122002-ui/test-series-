import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { syllabusFor } from "@/lib/services/syllabus";
import { PageHeading, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { SyllabusTracker } from "@/components/syllabus-tracker";
export default async function SyllabusPage() {
  const user = await requireUser(true),
    syllabus = await syllabusFor(user.id);
  return (
    <>
      <PageHeading
        eyebrow="SEE HOW FAR YOU’VE COME"
        title="My syllabus"
        description="Track what you’re learning, then put your completed topics into practice."
        action={
          <Button asChild>
            <Link href="/tests/create?kind=COMPLETED">
              Test my completed topics →
            </Link>
          </Button>
        }
      />
      {syllabus ? (
        <SyllabusTracker initial={syllabus} />
      ) : (
        <EmptyState
          title="No active syllabus yet"
          description="An administrator needs to configure the syllabus."
        />
      )}
    </>
  );
}
