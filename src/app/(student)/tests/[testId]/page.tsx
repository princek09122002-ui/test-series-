import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { studentAttempt } from "@/lib/services/testing";
import { ExamPlayer } from "@/components/exam-player";
export default async function TakeTest({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const user = await requireUser(true),
    { testId } = await params,
    attempt = await studentAttempt(testId, user.id);
  if (attempt.status === "SUBMITTED") redirect(`/tests/${testId}/result`);
  return <ExamPlayer initial={attempt} />;
}
