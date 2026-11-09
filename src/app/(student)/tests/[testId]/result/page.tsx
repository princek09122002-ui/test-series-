import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Clock3, Target, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { asSnapshot, ownedAttempt } from "@/lib/services/testing";
import { analytics } from "@/lib/domain/scoring";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeading, Metric } from "@/components/shared";
import { OutcomeChart, BreakdownChart } from "@/components/performance-charts";
import { LearningControls } from "@/components/learning-controls";
import { ScienceText } from "@/components/science-text";
import { QuestionImage } from "@/components/question-image";
import { cn, secondsLabel } from "@/lib/utils";
export default async function Result({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const user = await requireUser(true),
    { testId } = await params,
    attempt = await ownedAttempt(testId, user.id);
  if (attempt.status !== "SUBMITTED") redirect(`/tests/${testId}`);
  const challenge = attempt.test.challenge,
    embargo = challenge && challenge.endsAt > new Date();
  if (embargo)
    return (
      <>
        <PageHeading
          title="Your challenge is submitted"
          description="Results and explanations become available when the challenge closes, so everyone can attempt the same paper fairly."
        />
        <Card className="p-7">
          <p className="text-sm">
            Come back after {challenge.endsAt.toISOString()} UTC.
          </p>
          <Button asChild className="mt-5">
            <Link href="/challenges">Back to challenges</Link>
          </Button>
        </Card>
      </>
    );
  const rows = attempt.test.questions.map((q) => {
    const s = asSnapshot(q.snapshot),
      r = attempt.responses.find((r) => r.testQuestionId === q.id);
    return {
      q,
      s,
      r,
      id: q.id,
      correctOption: s.correctOption,
      selectedOption: r?.selectedOption ?? null,
      activeMs: r?.activeMs ?? 0,
      subject: s.subject,
      chapter: s.chapter,
      topics: s.topics,
    };
  });
  const summary = analytics(rows, attempt.test.configuration!),
    elapsed =
      ((attempt.submittedAt ?? new Date()).getTime() -
        attempt.startedAt.getTime()) /
      1000;
  const bookmarks = new Set(
    (
      await db.bookmark.findMany({
        where: { userId: user.id },
        select: { questionId: true },
      })
    ).map((b) => b.questionId),
  );
  return (
    <>
      <PageHeading
        eyebrow="ANOTHER STEP FORWARD"
        title="Your test, understood."
        description={attempt.test.name}
        action={
          <Button asChild>
            <Link href="/tests/create">
              Create another test
              <ArrowRight />
            </Link>
          </Button>
        }
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        <Metric
          label="Your score"
          value={`${attempt.score} / ${attempt.maximum}`}
          detail={
            attempt.test.configuration!.mode === "NEET"
              ? "NEET-style scoring · +4 / −1"
              : "Practice scoring · +4 / 0"
          }
          icon={Trophy}
        />
        <Metric
          label="Attempt accuracy"
          value={
            summary.accuracy === null ? "—" : `${Math.round(summary.accuracy)}%`
          }
          detail={`${summary.attempted} of ${rows.length} questions answered`}
          icon={Target}
        />
        <Metric
          label="Correct answers"
          value={summary.correct}
          detail={`${summary.incorrect} incorrect · ${summary.unattempted} unattempted`}
          icon={Check}
        />
        <Metric
          label="Elapsed time"
          value={secondsLabel(elapsed)}
          detail={`${Math.round(summary.activeMs / 1000)} seconds active solving estimate`}
          icon={Clock3}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Answer distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <OutcomeChart
              correct={summary.correct}
              incorrect={summary.incorrect}
              unattempted={summary.unattempted}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Accuracy by subject</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownChart
              data={summary.subjects.map((s) => ({
                name: s.name,
                value: Math.round(s.accuracy ?? 0),
              }))}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Topic breakdown</CardTitle>
          <p className="text-xs text-muted-foreground">
            Evidence from this attempt. A small sample is not proof of mastery.
          </p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Observed</th>
                <th>Correct</th>
                <th>Incorrect</th>
                <th>Accuracy</th>
                <th>Active time</th>
              </tr>
            </thead>
            <tbody>
              {summary.topics.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td>{t.observations}</td>
                  <td>{t.correct}</td>
                  <td>{t.incorrect}</td>
                  <td>
                    {t.accuracy === null ? "—" : `${Math.round(t.accuracy)}%`}
                  </td>
                  <td>{secondsLabel(t.activeMs / 1000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Time & pacing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-5 text-sm">
            <p>
              <span className="block text-xs text-muted-foreground mb-1">
                Median recorded question time
              </span>
              {secondsLabel(summary.medianMs / 1000)}
            </p>
            <p>
              <span className="block text-xs text-muted-foreground mb-1">
                Attempt rate
              </span>
              {Math.round(summary.attemptRate)}%
            </p>
            <p>
              <span className="block text-xs text-muted-foreground mb-1">
                Inactive / uncertain time
              </span>
              {secondsLabel(Math.max(0, elapsed - summary.activeMs / 1000))}
            </p>
          </div>
          <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
            Active time excludes detected hidden or unfocused periods. It is an
            interaction estimate, not proof of attention. Shared-topic time is
            split evenly between question topics. No population speed benchmarks
            are inferred.
          </p>
        </CardContent>
      </Card>
      <div className="mt-9 mb-5 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Review, understand, improve</h2>
        <Badge>{rows.length} QUESTIONS</Badge>
      </div>
      <div className="space-y-5">
        {rows.map(({ q, s, r }, i) => {
          const correct = r?.selectedOption === s.correctOption,
            skipped =
              r?.selectedOption === undefined || r.selectedOption === null;
          return (
            <Card key={q.id} className="p-5 md:p-7">
              <div className="flex justify-between items-center mb-5 gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge>QUESTION {i + 1}</Badge>
                  <Badge
                    className={
                      correct
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : skipped
                          ? ""
                          : "bg-destructive/10 text-destructive"
                    }
                  >
                    {correct
                      ? "CORRECT"
                      : skipped
                        ? "UNATTEMPTED"
                        : "INCORRECT"}
                  </Badge>
                  <Badge>{s.difficulty}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {secondsLabel((r?.activeMs ?? 0) / 1000)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {s.subject} · {s.chapter} ·{" "}
                {s.topics.map((t) => t.name).join(", ")}
              </p>
              <ScienceText text={s.text} />
              {s.correction && (
                <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  Answer key explicitly corrected: {s.correction.reason}. Your
                  result has been rescored.
                </p>
              )}
              {s.media.map((m) => (
                <QuestionImage
                  key={m.url}
                  src={m.url}
                  alt={m.alt}
                  referrerPolicy="no-referrer"
                  className="my-4 h-auto w-full max-w-full rounded-xl"
                />
              ))}
              <div className="grid sm:grid-cols-2 gap-3 mt-5">
                {s.options.map((o, j) => (
                  <div
                    className={cn(
                      "border rounded-xl p-3 flex gap-3 text-sm",
                      j === s.correctOption
                        ? "border-emerald-300 bg-emerald-500/5"
                        : j === r?.selectedOption
                          ? "border-red-300 bg-destructive/5"
                          : "",
                    )}
                    key={j}
                  >
                    <strong>{String.fromCharCode(65 + j)}.</strong>
                    <div>
                      <ScienceText text={o} />
                      {j === s.correctOption && (
                        <span className="block mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                          Correct answer
                        </span>
                      )}
                      {j === r?.selectedOption && (
                        <span className="block mt-1 text-[10px] text-muted-foreground">
                          Your answer
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-secondary rounded-xl p-4 mt-5 text-sm">
                <h3 className="font-semibold text-xs mb-2">WHY THIS ANSWER</h3>
                <ScienceText text={s.explanation} />
              </div>
              <LearningControls
                testId={testId}
                testQuestionId={q.id}
                topics={s.topics}
                bookmarked={bookmarks.has(q.questionId)}
              />
            </Card>
          );
        })}
      </div>
    </>
  );
}
