import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { rateLimit, readJson } from "@/lib/security";
import { generateTest } from "@/lib/services/testing";
export const POST = api(async (request) => {
  const user = await requireUser();
  await rateLimit(`generate:${user.id}`, 30, 3600);
  return Response.json(await generateTest(user.id, await readJson(request)), {
    status: 201,
  });
});
