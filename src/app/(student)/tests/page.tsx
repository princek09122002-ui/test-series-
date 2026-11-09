import { requireUser } from "@/lib/auth";
import { userPerformance } from "@/lib/services/performance";
import { PageHeading, NewTestButton } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { AttemptList } from "@/components/attempt-list";
export default async function TestsPage() {
  const user = await requireUser(true),
    { attempts } = await userPerformance(user.id);
  return (
    <>
      <PageHeading
        eyebrow="YOUR PRACTICE LIBRARY"
        title="My tests"
        description="Resume a test or revisit what your last attempt taught you."
        action={<NewTestButton />}
      />
      <Card className="overflow-hidden">
        <AttemptList attempts={attempts} timezone={user.profile?.timezone} />
      </Card>
    </>
  );
}
