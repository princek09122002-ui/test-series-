import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const secureToken = () => randomBytes(32).toString("hex");
export async function rateLimit(key: string, limit = 10, windowSeconds = 900) {
  const hashed = hashToken(key);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${hashed}, 1, NOW() + ${windowSeconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN NOW() + ${windowSeconds} * INTERVAL '1 second' ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  if (rows[0].count > limit)
    throw new AppError("Too many requests. Please try again later.", 429);
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000")
    .origin;
  if (origin !== expected)
    throw new AppError("Request origin is not allowed", 403);
}
export async function readJson(request: Request) {
  assertOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("Use JSON request content", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Request body is required");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 1048576) {
      await reader.cancel();
      throw new AppError("Request exceeds the 1 MB limit", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AppError("Invalid JSON");
  }
}
