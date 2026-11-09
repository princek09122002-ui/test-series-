import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { PageHeading } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
export default async function Onboarding() {
  const user = await requireUser(true);
  return (
    <>
      <PageHeading
        eyebrow="WELCOME TO YOUR LEARNING SPACE"
        title="Let’s make this personal."
        description="Tell us a little about your preparation. You can update everything later."
        action={
          <Link href="/dashboard" className="text-sm text-primary">
            Explore first →
          </Link>
        }
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <ProfileForm
            onboarding
            initial={{
              name: user.name ?? "Student",
              stage: "CLASS_11",
              examYear: 2027,
              language: "en",
              dailyGoal: 20,
              subjects: ["Physics", "Chemistry", "Biology"],
              displayName: "",
              leaderboard: false,
              timezone: "Asia/Kolkata",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
