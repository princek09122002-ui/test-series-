import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { assertOrigin } from "@/lib/security";
export const DELETE = api(async (request) => {
  assertOrigin(request);
  const user = await requireUser();
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return Response.json({ ok: true });
});
