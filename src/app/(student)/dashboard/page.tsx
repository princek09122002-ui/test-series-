import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Atom,
  FlaskConical,
  Dna,
  Target,
  ClipboardCheck,
  Clock3,
  BookOpen,
  CalendarCheck,
  Sparkles,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syllabusFor } from "@/lib/services/syllabus";
import { userPerformance } from "@/lib/services/performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Metric,
  EmptyState,
  PageHeading,
  NewTestButton,
} from "@/components/shared";
import { TrendChart } from "@/components/performance-charts";
import { AttemptList } from "@/components/attempt-list";
import { percent, dateLabel } from "@/lib/utils";
export default async function Dashboard() {
  const user = await requireUser(true);
  const [syllabus, performance, revisions] = await Promise.all([
    syllabusFor(user.id),
    userPerformance(user.id),
    db.revisionTask.findMany({
      where: { userId: user.id, completedAt: null },
      include: { topic: { include: { chapter: true } } },
      orderBy: { dueAt: "asc" },
      take: 4,
    }),
  ]);
  const topics =
      syllabus?.subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics)) ??
      [],
    completed = topics.filter((t) =>
      ["COMPLETED", "REVISING"].includes(t.status),
    ).length;
  const a = performance.aggregate;
  return (
    <>
      <PageHeading
        eyebrow="YOUR PREPARATION, IN FOCUS"
        title={`Good to see you, ${user.name?.split(" ")[0] ?? "learner"} 👋`}
        description="Every concept understood is a step forward. Let’s make today count."
        action={<NewTestButton />}
      />
      <div className="mb-7 grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-[#252e68] text-white p-7 md:p-8 grid-paper">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[10px] text-indigo-100">
            <Sparkles className="size-3" />
            BUILT AROUND YOU
          </span>
          <h2 className="mt-5 text-2xl md:text-[28px] font-semibold tracking-tight leading-tight">
            You set the syllabus.
            <br />
            We shape the practice.
          </h2>
          <p className="mt-3 text-sm text-indigo-100/70 max-w-sm leading-relaxed">
            Pick the chapters and topics you’ve studied. Get a test that’s
            exactly where you are.
          </p>
          <Button
            className="mt-6 bg-white text-[#303974] hover:bg-indigo-50"
            asChild
          >
            <Link href="/tests/create">
              <Plus />
              Create a custom test
              <ArrowRight />
            </Link>
          </Button>
          <div className="absolute -right-14 top-12 size-56 rounded-full border-[35px] border-white/[.04] pointer-events-none" />
        </section>
        <Card className="p-6 md:p-7 flex flex-col justify-between">
          <div>
            <span className="eyebrow">A LITTLE DIRECTION</span>
            <h2 className="mt-3 text-lg font-semibold">Your next best step</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {revisions.length
                ? "Give a difficult concept another look. Your revision plan is ready whenever you are."
                : completed
                  ? "You’ve marked topics as complete. A short test can help you see which ideas are sticking."
                  : "Start by marking the topics you’ve studied. We’ll help you turn your progress into focused practice."}
            </p>
          </div>
          <Link
            href={
              revisions.length
                ? "/revision"
                : completed
                  ? "/tests/create?kind=COMPLETED"
                  : "/syllabus"
            }
            className="mt-5 flex items-center justify-between border-t pt-4 text-sm font-semibold text-primary"
          >
            {revisions.length
              ? "Open revision plan"
              : completed
                ? "Test completed topics"
                : "Explore your syllabus"}
            <ArrowUpRight className="size-4" />
          </Link>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <Metric
          label="Tests completed"
          value={performance.submitted.length}
          detail="Your persisted assessment history"
          icon={ClipboardCheck}
        />
        <Metric
          label="Attempt accuracy"
          value={a.accuracy === null ? "—" : `${Math.round(a.accuracy)}%`}
          detail={
            a.attempted
              ? `${a.attempted} answered questions`
              : "Take a test to establish your starting point"
          }
          icon={Target}
          color="text-emerald-600"
        />
        <Metric
          label="Syllabus progress"
          value={`${percent(completed, topics.length)}%`}
          detail={`${completed} of ${topics.length} active topics completed`}
          icon={BookOpen}
          color="text-violet-600"
        />
        <Metric
          label="Active practice"
          value={`${Math.round(a.activeMs / 60000)} min`}
          detail="Estimated time solving visible questions"
          icon={Clock3}
          color="text-amber-600"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>How your practice is progressing</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Accuracy across your recent submitted tests
                </p>
              </div>
              <Link
                href="/analytics"
                className="text-xs text-primary font-semibold"
              >
                View analytics ↗
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {performance.trend.length ? (
              <TrendChart data={performance.trend} />
            ) : (
              <EmptyState
                title="A clearer picture with every test"
                description="Your accuracy trend will take shape as you practice. Start with a short test on a topic you know."
                href="/tests/create"
                label="Take your first test"
              />
            )}
            <p className="text-[10px] text-muted-foreground">
              Custom test scores reflect different content and difficulty;
              trends describe practice, not predicted exam rank.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Revision, made manageable</CardTitle>
              <CalendarCheck className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {revisions.length ? (
              <div className="space-y-4">
                {revisions.map((r) => (
                  <Link
                    href={`/tests/create?topic=${r.topicId}`}
                    key={r.id}
                    className="block rounded-xl bg-background p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <p className="text-xs font-semibold">{r.topic.name}</p>
                      <span className="size-1.5 mt-1 rounded-full bg-amber-400 shrink-0" />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {r.topic.chapter.name} ·{" "}
                      {dateLabel(r.dueAt, user.profile?.timezone)}
                    </p>
                  </Link>
                ))}
                <Link
                  href="/revision"
                  className="text-xs text-primary font-semibold inline-block"
                >
                  View your revision plan →
                </Link>
              </div>
            ) : (
              <EmptyState
                title="Nothing due just yet"
                description="When a test reveals a tricky concept, it will find a place in your revision plan."
                icon={CalendarCheck}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <section className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            A little progress in every subject
          </h2>
          <Link className="text-xs text-primary font-semibold" href="/syllabus">
            View syllabus ↗
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {syllabus?.subjects.map((s, i) => {
            const Icon = [Atom, FlaskConical, Dna][i % 3],
              st = s.chapters.flatMap((c) => c.topics),
              done = st.filter((t) =>
                ["COMPLETED", "REVISING"].includes(t.status),
              ).length;
            return (
              <Card key={s.id} className="p-5">
                <div className="flex gap-3 items-center mb-5">
                  <span
                    className={`p-2.5 rounded-xl ${["text-blue-600 bg-blue-500/8", "text-violet-600 bg-violet-500/8", "text-emerald-600 bg-emerald-500/8"][i % 3]}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{s.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {s.chapters.length} chapters · {st.length} topics
                    </p>
                  </div>
                  <span className="ml-auto text-sm font-semibold">
                    {percent(done, st.length)}%
                  </span>
                </div>
                <Progress value={percent(done, st.length)} />
                <p className="text-[11px] text-muted-foreground mt-3">
                  {done} topics marked completed or revising
                </p>
              </Card>
            );
          })}
        </div>
        {syllabus?.demo && (
          <p className="mt-3 text-[10px] text-muted-foreground">
            Progress uses the active illustrative syllabus as its denominator.
            It does not represent complete official NEET coverage.
          </p>
        )}
      </section>
      <Card className="mt-8 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between pb-2">
            <CardTitle>Recent tests</CardTitle>
            <Link
              href="/history"
              className="text-xs font-semibold text-primary"
            >
              View all history ↗
            </Link>
          </div>
        </CardHeader>
        <AttemptList
          attempts={performance.attempts.slice(0, 4)}
          timezone={user.profile?.timezone}
        />
      </Card>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["/tests/create?kind=FULL_MOCK", "Full NEET simulation"],
          ["/tests/create?kind=COMPLETED", "Test completed topics"],
          ["/tests/create?kind=WEAK", "Practice weak topics"],
        ].map(([href, label]) => (
          <Link
            href={href}
            key={href}
            className="rounded-xl border bg-card p-4 flex items-center justify-between text-xs font-medium hover:border-primary/40"
          >
            {label}
            <ArrowRight className="size-4 text-primary" />
          </Link>
        ))}
      </div>
    </>
  );
}
