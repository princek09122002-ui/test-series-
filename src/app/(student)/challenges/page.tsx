import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading, EmptyState } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dateLabel } from "@/lib/utils";
export default async function Challenges() {
  const user = await requireUser(true),
    challenges = await db.challenge.findMany({
      where: {
        published: true,
        OR: [
          { public: true },
          { participations: { some: { userId: user.id } } },
        ],
      },
      include: {
        test: {
          include: {
            configuration: true,
            _count: { select: { questions: true } },
          },
        },
        _count: { select: { participations: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });
  return (
    <>
      <PageHeading
        eyebrow="A SHARED CHALLENGE, A PERSONAL BEST"
        title="Practice together. Grow individually."
        description="Same paper, same time limit, transparent rules. Leaderboards are always optional."
      />
      <Card className="p-5 text-sm text-muted-foreground mb-6">
        Only common-paper challenge results are ranked. Your custom tests are
        personal practice and never receive a universal rank. Manage your alias
        and opt-in in{" "}
        <Link className="text-primary" href="/profile">
          profile preferences
        </Link>
        .
      </Card>
      {challenges.length ? (
        <div className="grid md:grid-cols-2 gap-5">
          {challenges.map((c) => (
            <Card className="p-6" key={c.id}>
              <Badge>
                {new Date() < c.startsAt
                  ? "UPCOMING"
                  : new Date() > c.endsAt
                    ? "CLOSED"
                    : "OPEN WINDOW"}
              </Badge>
              <h2 className="font-semibold text-xl mt-4">{c.name}</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {c.description}
              </p>
              <p className="text-xs text-muted-foreground mt-5">
                {c.test._count.questions} questions ·{" "}
                {Math.round((c.test.configuration?.durationSeconds ?? 0) / 60)}{" "}
                min · {c._count.participations} participants
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {dateLabel(c.startsAt, user.profile?.timezone)} –{" "}
                {dateLabel(c.endsAt, user.profile?.timezone)}
              </p>
              <Link
                className="mt-5 block text-sm font-semibold text-primary"
                href={`/challenges/${c.id}`}
              >
                View challenge & rules →
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="The next shared challenge is on its way"
            description="An administrator can create a common-paper challenge once enough approved content is ready. Your own practice is always available."
            href="/tests/create"
          />
        </Card>
      )}
    </>
  );
}
