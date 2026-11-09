import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { db } from "@/lib/db";
import { AppError } from "@/lib/security";
export const GET = api(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError("Not found", 404);
  if (user.role === "STUDENT") {
    const assigned = await db.testQuestion.findFirst({
      where: {
        questionId: id,
        test: { attempts: { some: { userId: user.id } } },
      },
      select: { id: true },
    });
    if (!assigned) throw new AppError("Not found", 404);
  }
  try {
    const data = await readFile(
      path.join(process.cwd(), ".local/question-media", id + ".png"),
    );
    return new Response(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    throw new AppError("Image not found", 404);
  }
});
