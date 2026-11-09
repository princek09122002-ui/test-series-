import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/security";
import { GenerationError } from "@/lib/domain/generation";
export function api(
  handler: (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => Promise<Response>,
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ZodError)
        return Response.json(
          { error: error.issues.map((i) => i.message).join(". ") },
          { status: 400 },
        );
      if (error instanceof AppError)
        return Response.json(
          { error: error.message },
          { status: error.status },
        );
      if (error instanceof GenerationError)
        return Response.json(
          { error: error.message, details: error.details },
          { status: 422 },
        );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return Response.json(
          { error: "This record already exists" },
          { status: 409 },
        );
      console.error(
        "Request failed",
        error instanceof Error ? error.message : "Unknown error",
      );
      return Response.json(
        { error: "The request could not be completed. Please try again." },
        { status: 500 },
      );
    }
  };
}
