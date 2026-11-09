import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { assertOrigin } from "@/lib/security";
import { finalizeAttempt, ownedAttempt } from "@/lib/services/testing";
export const POST = api(async (request, { params }) => {
  assertOrigin(request);
  const user = await requireUser(),
    { testId } = await params,
    attempt = await ownedAttempt(testId, user.id);
  await finalizeAttempt(attempt.id, user.id);
  return Response.json({ ok: true });
});
