import { requireUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { readJson, rateLimit } from "@/lib/security";
import { availability } from "@/lib/services/testing";
export const POST = api(async (request) => {
  const user = await requireUser();
  await rateLimit(`availability:${user.id}`, 120, 60);
  return Response.json(await availability(user.id, await readJson(request)));
});
