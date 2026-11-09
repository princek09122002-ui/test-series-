import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { api } from "@/lib/api";
import { emailSchema, passwordSchema } from "@/lib/domain/validation";
import {
  AppError,
  hashToken,
  rateLimit,
  readJson,
  secureToken,
} from "@/lib/security";
import { sendPasswordReset } from "@/lib/mail";
export const POST = api(async (request) => {
  const { email } = z
    .object({ email: emailSchema })
    .parse(await readJson(request));
  await rateLimit(`reset:${email}`, 3);
  if (!process.env.RESEND_API_KEY)
    throw new AppError(
      "Password reset email is not configured. Contact the platform administrator.",
      503,
    );
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.disabled) {
    const token = secureToken();
    await db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1800000),
      },
    });
    await sendPasswordReset(email, token);
  }
  return Response.json({
    ok: true,
    message: "If an eligible account exists, a reset link has been sent.",
  });
});
export const PATCH = api(async (request) => {
  const { token, password } = z
    .object({ token: z.string().length(64), password: passwordSchema })
    .parse(await readJson(request));
  await rateLimit(`consume-reset:${hashToken(token)}`, 5);
  const passwordHash = await hash(password, 12);
  await db.$transaction(async (tx) => {
    const reset = await tx.passwordReset.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!reset || reset.expiresAt < new Date())
      throw new AppError("The reset link is invalid or expired");
    const removed = await tx.passwordReset.deleteMany({
      where: { id: reset.id, expiresAt: { gt: new Date() } },
    });
    if (removed.count !== 1)
      throw new AppError("The reset link has already been used");
    await tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
  });
  return Response.json({ ok: true });
});
