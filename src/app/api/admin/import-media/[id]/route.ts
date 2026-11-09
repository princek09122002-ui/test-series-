import { importSubject, importDirectory } from "@/lib/domain/import-source";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { api } from "@/lib/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/security";
export const GET = api(async (_request, context) => {
  await requireStaff();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new AppError("Not found", 404);
  const record = await db.sourceQuestion.findUnique({
    where: { id },
    include: { source: true },
  });
  if (!record) throw new AppError("Not found", 404);
  const directory = importDirectory(importSubject(record.source.metadata));
  const bytes = await readFile(
    path.join(
      process.cwd(),
      new URL(_request.url).searchParams.get("presentation") === "1"
        ? directory + "/approved-media"
        : directory + "/media",
      id + ".png",
    ),
  );
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
