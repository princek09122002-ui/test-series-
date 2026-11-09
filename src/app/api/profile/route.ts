import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { profileSchema } from "@/lib/domain/validation";
import { readJson } from "@/lib/security";
export const PATCH = api(async (request) => {
  const user = await requireUser(),
    { name, ...data } = profileSchema.parse(await readJson(request));
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name } }),
    db.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data, onboarded: true },
      update: { ...data, onboarded: true },
    }),
  ]);
  return Response.json({ ok: true });
});
