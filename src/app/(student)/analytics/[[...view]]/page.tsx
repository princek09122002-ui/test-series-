import Link from "next/link";
import { Target, Clock3, ClipboardCheck, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userPerformance } from "@/lib/services/performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading, EmptyState, Metric } from "@/components/shared";
import {
  TrendChart,
  BreakdownChart,
  OutcomeChart,
  ScoreTrendChart,
  PacingChart,
} from "@/components/performance-charts";
import { secondsLabel } from "@/lib/utils";
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const user = await requireUser(true),
    {
      aggregate: a,
      submitted,
      trend,
      outcomes,
    } = await userPerformance(user.id),
    view = (await params).view?.[0] ?? "overview";
  const slowWrong = outcomes.filter(
    (o) =>
      o.selectedOption !== null &&
      o.selectedOption !== o.correctOption &&
      o.activeMs > a.medianMs * 1.5 &&
      o.activeMs > 30000,
  );
  return (
    <>
      <PageHeading
        eyebrow="KNOW YOUR PREPARATION"
        title="Performance, with perspective."
        description="Understand your patterns. Use the evidence to choose your next step."
      />
      <nav className="mb-6 flex flex-wrap gap-2">
        {[
          ["overview", "Overview"],
          ["subjects", "Subjects"],
          ["topics", "Topics"],
          ["time-management", "Time management"],
        ].map(([v, l]) => (
          <Link
            key={v}
            className={`px-4 py-2 rounded-lg text-sm ${view === v ? "bg-primary text-white" : "bg-card border text-muted-foreground"}`}
            href={`/analytics${v === "overview" ? "" : "/" + v}`}
          >
            {l}
          </Link>
        ))}
      </nav>
      {!submitted.length ? (
        <Card>
          <EmptyState
            title="Your learning story starts with a test"
            description="Once you submit an assessment, you’ll see actual accuracy, topic coverage, and pacing insights here."
            href="/tests/create"
          />
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Metric
              label="Submitted tests"
              value={submitted.length}
              detail="All completed practice sessions"
              icon={ClipboardCheck}
            />
            <Metric
              label="Answer accuracy"
              value={a.accuracy === null ? "—" : `${Math.round(a.accuracy)}%`}
              detail={`${a.attempted} answered questions in released results`}
              icon={Target}
            />
            <Metric
              label="Active solving"
              value={`${Math.round(a.activeMs / 60000)} min`}
              detail="Estimated foreground interaction"
              icon={Clock3}
            />
            <Metric
              label="Topics observed"
              value={a.topics.length}
              detail="Assessment evidence, separate from declared progress"
              icon={TrendingUp}
            />
          </div>
          {view === "overview" && (
            <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Recent accuracy trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={trend} />
                  <p className="text-[10px] text-muted-foreground">
                    Custom tests vary in scope and difficulty. This is a
                    descriptive trend, not a NEET score prediction.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Your answer mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <OutcomeChart
                    correct={a.correct}
                    incorrect={a.incorrect}
                    unattempted={a.unattempted}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          {view === "overview" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Score history</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Raw marks are shown for your records. Different lengths,
                  marking modes, and difficulty make arbitrary custom tests
                  incomparable.
                </p>
              </CardHeader>
              <CardContent>
                <ScoreTrendChart data={trend} />
              </CardContent>
            </Card>
          )}
          {(view === "overview" || view === "subjects") && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Across your subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <BreakdownChart
                  data={a.subjects.map((s) => ({
                    name: s.name,
                    value: Math.round(s.accuracy ?? 0),
                  }))}
                />
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Questions</th>
                        <th>Attempted</th>
                        <th>Accuracy</th>
                        <th>Avg. active time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.subjects.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td>{s.count}</td>
                          <td>{s.attempted}</td>
                          <td>
                            {s.accuracy === null
                              ? "—"
                              : `${Math.round(s.accuracy)}%`}
                          </td>
                          <td>{secondsLabel(s.activeMs / s.count / 1000)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
          {(view === "topics" || view === "overview") && (
            <Card className="mt-6 overflow-hidden">
              <CardHeader>
                <CardTitle>Concepts that deserve another look</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Observation counts are shown so small samples stay in
                  perspective.
                </p>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Observed</th>
                      <th>Accuracy</th>
                      <th>Evidence</th>
                      <th>Practice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...a.topics]
                      .sort((x, y) => (x.accuracy ?? 0) - (y.accuracy ?? 0))
                      .map((t) => (
                        <tr key={t.id}>
                          <td className="font-medium">{t.name}</td>
                          <td>{t.observations}</td>
                          <td>
                            {t.accuracy === null
                              ? "—"
                              : `${Math.round(t.accuracy)}%`}
                          </td>
                          <td className="text-xs text-muted-foreground">
                            {t.observations < 10
                              ? "Limited sample"
                              : "Descriptive assessment history"}
                          </td>
                          <td>
                            <Link
                              className="text-primary text-xs"
                              href={`/tests/create?topic=${t.id}`}
                            >
                              Practice →
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {view === "time-management" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Where your active time goes</CardTitle>
                </CardHeader>
                <CardContent>
                  <BreakdownChart
                    time
                    data={a.subjects.map((s) => ({
                      name: s.name,
                      value: Math.round(s.activeMs / 1000),
                    }))}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>A useful pacing observation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {slowWrong.length
                      ? `${slowWrong.length} incorrect answers took more than 1.5× your median recorded question time and over 30 seconds. Try revisiting the method without a timer, then use a fresh timed set to check understanding.`
                      : "There isn’t enough evidence for a specific pacing recommendation yet. Keep practicing and review both accuracy and time together."}
                  </p>
                  <p className="mt-5 text-xs text-muted-foreground">
                    This is an explainable product heuristic. No population
                    benchmark, exam rank, or cheating inference is made.
                  </p>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Speed & accuracy together</CardTitle>
                </CardHeader>
                <CardContent>
                  <PacingChart
                    data={a.subjects
                      .filter((s) => s.attempted > 0)
                      .map((s) => ({
                        name: s.name,
                        seconds: Math.round(s.activeMs / s.count / 1000),
                        accuracy: Math.round(s.accuracy ?? 0),
                        count: s.count,
                      }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Each point is one subject. Bubble size reflects observed
                    questions. This describes your practice and does not control
                    for differences in question difficulty.
                  </p>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Timing definitions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Elapsed time runs from server start to finalization, capped
                    at a timed deadline. Active time estimates foreground,
                    focused question interaction using short heartbeat
                    intervals.
                  </p>
                  <p>
                    First-pass time precedes a second visit to a question; later
                    recorded intervals count as revisit time. Hidden,
                    disconnected, and unrecorded intervals remain inactive or
                    uncertain. Background-tab time does not count as active
                    solving.
                  </p>
                  <p>
                    Topic time splits a multi-topic question’s active duration
                    evenly. Accuracy excludes unanswered questions. A missing
                    denominator displays “—”.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
}
