import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { api } from "@/lib/api";
import { signupSchema } from "@/lib/domain/validation";
import { readJson, rateLimit, AppError } from "@/lib/security";
export const POST = api(async (request) => {
  const data = signupSchema.parse(await readJson(request));
  await rateLimit("registration:global", 100, 60);
  await rateLimit(`register:${data.email}`, 4);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing)
    throw new AppError(
      "Unable to create this account. Try signing in or resetting your password.",
      409,
    );
  await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await hash(data.password, 12),
      profile: { create: {} },
    },
  });
  return Response.json({ ok: true }, { status: 201 });
});
