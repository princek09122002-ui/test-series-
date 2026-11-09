import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { asSnapshot } from "@/lib/services/testing";
import { PageHeading, EmptyState } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MistakeControls } from "@/components/learning-controls";
import { ScienceText } from "@/components/science-text";
import { Input, Select } from "@/components/ui/input";
import { dateLabel } from "@/lib/utils";
export default async function Mistakes({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    after?: string;
  }>;
}) {
  const user = await requireUser(true),
    filter = await searchParams;
  const all = await db.mistakeRecord.findMany({
    where: {
      userId: user.id,
      ...(filter.status === "reviewed"
        ? { reviewed: true }
        : filter.status === "pending"
          ? { reviewed: false }
          : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.after && !Number.isNaN(Date.parse(filter.after))
        ? { createdAt: { gte: new Date(filter.after) } }
        : {}),
    },
    include: {
      testQuestion: true,
      attempt: {
        include: { test: { include: { challenge: true } }, responses: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const mistakes = all
    .filter((m) => {
      const response = m.attempt.responses.find(
        (r) => r.testQuestionId === m.testQuestionId,
      );
      return (
        response?.selectedOption !== null &&
        response?.selectedOption !== undefined &&
        response.selectedOption !==
          asSnapshot(m.testQuestion.snapshot).correctOption
      );
    })
    .filter(
      (m) =>
        !m.attempt.test.challenge ||
        m.attempt.test.challenge.endsAt <= new Date(),
    )
    .filter((m) => {
      const s = asSnapshot(m.testQuestion.snapshot);
      return (
        !filter.q ||
        `${s.text} ${s.subject} ${s.chapter} ${s.topics.map((t) => t.name).join(" ")}`
          .toLowerCase()
          .includes(filter.q.toLowerCase())
      );
    });
  return (
    <>
      <PageHeading
        eyebrow="MISTAKES ARE INFORMATION"
        title="Your mistake notebook"
        description="Understand the error. Revisit the concept. Give yourself a better next attempt."
        action={
          <Button asChild>
            <Link href="/tests/create?kind=WEAK">Retest my mistakes →</Link>
          </Button>
        }
      />
      <form className="flex flex-wrap gap-3 mb-6">
        <Input
          className="flex-1 min-w-48"
          name="q"
          defaultValue={filter.q}
          placeholder="Search subject, chapter, topic, or question…"
          aria-label="Search mistakes"
        />
        <Select
          className="w-40"
          name="status"
          defaultValue={filter.status ?? ""}
          aria-label="Review status"
        >
          <option value="">All statuses</option>
          <option value="pending">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
        </Select>
        <Select
          className="w-44"
          name="category"
          defaultValue={filter.category ?? ""}
          aria-label="Mistake type"
        >
          <option value="">All mistake types</option>
          {[
            "CONCEPT",
            "FORGOTTEN",
            "CALCULATION",
            "MISREAD",
            "GUESSING",
            "TIME_PRESSURE",
            "OTHER",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Input
          className="w-40"
          type="date"
          name="after"
          defaultValue={filter.after}
          aria-label="Mistakes after date"
        />
        <Button variant="outline">Apply filters</Button>
      </form>
      {!mistakes.length ? (
        <Card>
          <EmptyState
            title="Nothing here yet"
            description="Incorrect answers from completed tests appear here. Use them to understand what to practice next."
            href="/tests/create"
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {mistakes.map((m) => {
            const s = asSnapshot(m.testQuestion.snapshot);
            return (
              <Card className="p-6" key={m.id}>
                <p className="text-xs text-muted-foreground mb-3">
                  {s.subject} · {s.chapter} ·{" "}
                  {dateLabel(m.createdAt, user.profile?.timezone)}
                </p>
                <ScienceText text={s.text} />
                <div className="mt-4 p-4 rounded-xl bg-secondary text-sm">
                  <p className="font-semibold mb-2">
                    Correct answer: {String.fromCharCode(65 + s.correctOption)}.{" "}
                    <ScienceText text={s.options[s.correctOption]} />
                  </p>
                  <ScienceText text={s.explanation} />
                </div>
                <MistakeControls
                  id={m.id}
                  category={m.category}
                  reviewed={m.reviewed}
                />
                <Link
                  className="mt-4 block text-xs font-semibold text-primary"
                  href={`/tests/${m.attempt.testId}/result`}
                >
                  Open full test review →
                </Link>
              </Card>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Showing up to 200 recent matching records. Narrow your filters to
            find older mistakes.
          </p>
        </div>
      )}
    </>
  );
}
