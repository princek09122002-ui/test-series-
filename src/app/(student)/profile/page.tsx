import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { PageHeading } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
export default async function ProfilePage() {
  const user = await requireUser(true),
    p = user.profile;
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Your profile"
        description="A few preferences to make your preparation fit you."
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground mb-6">
            Signed in as {user.email}
          </p>
          <ProfileForm
            initial={{
              name: user.name ?? "Student",
              stage: (p?.stage ?? "CLASS_11") as
                "CLASS_11" | "CLASS_12" | "REPEATER",
              examYear: p?.examYear ?? 2027,
              language: (p?.language ?? "en") as "en" | "hi",
              dailyGoal: p?.dailyGoal ?? 20,
              subjects: (p?.subjects ?? [
                "Physics",
                "Chemistry",
                "Biology",
              ]) as ("Physics" | "Chemistry" | "Biology")[],
              displayName: p?.displayName ?? "",
              leaderboard: p?.leaderboard ?? false,
              timezone: p?.timezone ?? "Asia/Kolkata",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
