import { expireAttempts } from "@/lib/services/testing";
import { timingSafeEqual } from "node:crypto";
export async function POST(request: Request) {
  const actual = Buffer.from(request.headers.get("authorization") ?? ""),
    expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  if (
    !process.env.CRON_SECRET ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ finalized: await expireAttempts() });
}
