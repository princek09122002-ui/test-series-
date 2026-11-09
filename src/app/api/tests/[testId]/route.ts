import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { studentAttempt } from "@/lib/services/testing";
export const GET = api(async (_request, { params }) => {
  const user = await requireUser(),
    { testId } = await params;
  return Response.json(await studentAttempt(testId, user.id), {
    headers: { "Cache-Control": "no-store" },
  });
});
