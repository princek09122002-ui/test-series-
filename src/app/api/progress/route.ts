import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppError, readJson } from "@/lib/security";
export const PATCH = api(async (request) => {
  const user = await requireUser(),
    { topicId, status } = z
      .object({
        topicId: z.string(),
        status: z.enum(["NOT_STARTED", "LEARNING", "COMPLETED", "REVISING"]),
      })
      .parse(await readJson(request));
  const topic = await db.topic.findFirst({
    where: {
      id: topicId,
      active: true,
      chapter: { active: true, subject: { syllabus: { active: true } } },
    },
  });
  if (!topic) throw new AppError("Topic not found", 404);
  await db.userTopicProgress.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    create: { userId: user.id, topicId, status },
    update: { status },
  });
  return Response.json({ ok: true });
});
