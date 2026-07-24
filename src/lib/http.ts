import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/domain/errors";

// Uniform JSON envelope + error mapping so every route handler responds the
// same way. Handlers wrap their body in withErrors() and throw AppError /
// ZodError instead of hand-writing status codes.

export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

/** Wrap an async handler so thrown errors become structured JSON responses. */
export async function withErrors(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof ZodError) {
      return errorResponse(422, "VALIDATION", "Validation failed", err.issues);
    }
    if (err instanceof AppError) {
      return errorResponse(err.status, err.code, err.message, err.details);
    }
    console.error("Unhandled error in route handler:", err);
    return errorResponse(500, "INTERNAL", "Something went wrong");
  }
}

export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
