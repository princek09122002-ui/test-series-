import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevokeSessions } from "@/components/profile-form";
import Link from "next/link";
import { dateLabel } from "@/lib/utils";
export default async function Settings() {
  const user = await requireUser(true),
    sessions = await db.session.findMany({
      where: { userId: user.id, expires: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, expires: true },
    });
  return (
    <>
      <PageHeading
        title="Account settings"
        description="Manage your access, preferences, and connected features."
      />
      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Security & sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {sessions.length} active session{sessions.length === 1 ? "" : "s"}
              . Password resets invalidate all sessions.
            </p>
            <ul className="mb-6 text-sm space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between border-b pb-3 gap-3"
                >
                  <span>
                    Signed in {dateLabel(s.createdAt, user.profile?.timezone)}
                  </span>
                  <span className="text-muted-foreground">
                    Expires {dateLabel(s.expires, user.profile?.timezone)}
                  </span>
                </li>
              ))}
            </ul>
            <RevokeSessions />
            <Link
              className="block mt-4 text-sm text-primary"
              href="/forgot-password"
            >
              Reset your password →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preferences & privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your preparation stage, language, timezone, practice goal, and
              leaderboard visibility.
            </p>
            <Link className="text-sm text-primary" href="/profile">
              Edit profile preferences →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Optional AI features</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              AI assistance is not enabled in this release. Test generation,
              scoring, analytics, and revision work independently.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
