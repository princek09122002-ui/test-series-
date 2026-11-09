import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeading, EmptyState } from "@/components/shared";
import { JoinChallenge } from "@/components/challenge-controls";
import { expireAttempts } from "@/lib/services/testing";
export default async function ChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ challengeId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = await requireUser(true),
    { challengeId } = await params,
    { invite } = await searchParams;
  let c = await db.challenge.findUnique({
    where: { id: challengeId },
    include: {
      test: {
        include: {
          configuration: true,
          _count: { select: { questions: true } },
        },
      },
      participations: {
        include: { user: { select: { profile: true } }, attempt: true },
      },
    },
  });
  if (
    !c ||
    !c.published ||
    (!c.public &&
      c.inviteCode !== invite &&
      !c.participations.some((p) => p.userId === user.id))
  )
    notFound();
  if (c.endsAt < new Date()) {
    await expireAttempts();
    c = (await db.challenge.findUnique({
      where: { id: challengeId },
      include: {
        test: {
          include: {
            configuration: true,
            _count: { select: { questions: true } },
          },
        },
        participations: {
          include: { user: { select: { profile: true } }, attempt: true },
        },
      },
    }))!;
  }
  const own = c.participations.find((p) => p.userId === user.id),
    closed = c.endsAt <= new Date(),
    entryEnd = new Date(
      c.endsAt.getTime() - (c.test.configuration?.durationSeconds ?? 0) * 1000,
    ),
    eligible = new Date() >= c.startsAt && new Date() <= entryEnd;
  const ranked = c.participations
    .filter(
      (p) =>
        p.attempt.status === "SUBMITTED" &&
        p.user.profile?.leaderboard &&
        p.user.profile.displayName,
    )
    .sort(
      (a, b) =>
        (b.attempt.score ?? 0) - (a.attempt.score ?? 0) ||
        a.attempt.submittedAt!.getTime() -
          a.attempt.startedAt.getTime() -
          (b.attempt.submittedAt!.getTime() - b.attempt.startedAt.getTime()) ||
        a.attempt.id.localeCompare(b.attempt.id),
    );
  return (
    <>
      <PageHeading title={c.name} description={c.description} />
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold">The same rules for everyone</h2>
        <ul className="mt-4 text-sm text-muted-foreground space-y-3">
          <li>
            Identical {c.test._count.questions}-question paper, in the same
            order.
          </li>
          <li>
            {Math.round((c.test.configuration?.durationSeconds ?? 0) / 60)}{" "}
            minutes per attempt. Correct +4, incorrect −1, unattempted 0.
          </li>
          <li>
            Rank: score descending, then elapsed completion time ascending.
            Exact ties share a rank.
          </li>
          <li>
            Entry opens {c.startsAt.toISOString()} and closes{" "}
            {entryEnd.toISOString()} (UTC).
          </li>
          <li>
            Questions and explanations release after {c.endsAt.toISOString()}{" "}
            (UTC).
          </li>
        </ul>
        <div className="mt-6">
          {own ? (
            <Button asChild>
              <Link
                href={`/tests/${c.testId}${own.attempt.status === "SUBMITTED" ? "/result" : ""}`}
              >
                {own.attempt.status === "SUBMITTED"
                  ? "View my result"
                  : "Resume my attempt"}
              </Link>
            </Button>
          ) : eligible ? (
            <JoinChallenge id={c.id} inviteCode={invite} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {closed
                ? "This challenge is closed."
                : "Starts are available only during the entry window."}
            </p>
          )}
        </div>
      </Card>
      <Card className="overflow-hidden p-6">
        <h2 className="font-semibold mb-4">Opt-in leaderboard</h2>
        {closed && ranked.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Alias</th>
                  <th>Score</th>
                  <th>Elapsed time</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p) => {
                  const elapsed =
                    p.attempt.submittedAt!.getTime() -
                    p.attempt.startedAt.getTime();
                  const firstIndex = ranked.findIndex(
                    (other) =>
                      other.attempt.score === p.attempt.score &&
                      other.attempt.submittedAt!.getTime() -
                        other.attempt.startedAt.getTime() ===
                        elapsed,
                  );
                  return (
                    <tr key={p.id}>
                      <td>{firstIndex + 1}</td>
                      <td>{p.user.profile!.displayName}</td>
                      <td>
                        {p.attempt.score} / {p.attempt.maximum}
                      </td>
                      <td>{Math.round(elapsed / 1000)} s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              closed
                ? "No public aliases to display"
                : "Results release together"
            }
            description={
              closed
                ? "Only participants who chose an alias and opted in appear here."
                : "The leaderboard becomes available after the challenge window closes."
            }
          />
        )}
      </Card>
    </>
  );
}
