import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading, EmptyState } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RevisionControls } from "@/components/learning-controls";
import { dateLabel } from "@/lib/utils";
export default async function RevisionPage() {
  const user = await requireUser(true),
    tasks = await db.revisionTask.findMany({
      where: { userId: user.id },
      include: {
        topic: { include: { chapter: { include: { subject: true } } } },
      },
      orderBy: { dueAt: "asc" },
    }),
    now = new Date(),
    tz = user.profile?.timezone ?? "Asia/Kolkata";
  const today = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const due = tasks.filter(
      (t) => !t.completedAt && today(t.dueAt) === today(now),
    ),
    overdue = tasks.filter(
      (t) => !t.completedAt && t.dueAt < now && today(t.dueAt) !== today(now),
    ),
    complete = tasks.filter((t) => t.completedAt);
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT STICK"
        title="Your revision plan"
        description="A manageable second look at concepts that need your attention."
        action={
          <Button asChild>
            <Link href="/tests/create?kind=WEAK">Create a revision test →</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          [due.length, "Due today"],
          [overdue.length, "Overdue"],
          [complete.length, "Completed"],
        ].map(([n, l]) => (
          <Card className="p-5" key={l}>
            <p className="text-2xl font-bold">{n}</p>
            <p className="text-xs text-muted-foreground mt-1">{l}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
        Default intervals: same day, then 3, 7, and 14 days. Self-reported
        recall adjusts the schedule; fresh assessment evidence provides a
        stronger retention check. These intervals are configurable heuristics.
      </p>
      {!tasks.length ? (
        <Card>
          <EmptyState
            title="Your plan will grow with your practice"
            description="Incorrect answers create topic revision tasks automatically. You can also add topics from a completed test’s review."
            href="/tests/create"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => (
            <Card className="p-5" key={t.id}>
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <div className="flex gap-2 items-center">
                    <h2 className="font-semibold">{t.topic.name}</h2>
                    <Badge
                      className={
                        !t.completedAt && t.dueAt < now
                          ? "text-amber-700 bg-amber-500/10 dark:text-amber-300"
                          : ""
                      }
                    >
                      {t.completedAt
                        ? "COMPLETED"
                        : today(t.dueAt) === today(now)
                          ? "DUE TODAY"
                          : t.dueAt < now
                            ? "OVERDUE"
                            : "UPCOMING"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.topic.chapter.subject.name} · {t.topic.chapter.name} ·
                    Review {dateLabel(t.dueAt, tz)}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Review stage {t.step + 1}
                    {t.lastReviewed
                      ? ` · Last reviewed ${dateLabel(t.lastReviewed, tz)}`
                      : ""}
                  </p>
                </div>
                <Button size="sm" asChild variant="outline">
                  <Link href={`/tests/create?topic=${t.topicId}`}>
                    Practice this topic →
                  </Link>
                </Button>
              </div>
              {!t.completedAt && (
                <div className="mt-5">
                  <RevisionControls taskId={t.id} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
