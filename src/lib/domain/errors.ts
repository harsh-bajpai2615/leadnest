// A single error type the service layer throws. The HTTP layer maps `status`
// straight onto the response, so route handlers never invent status codes.

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const forbidden = (msg = "You do not have access to this resource") =>
  new AppError("FORBIDDEN", msg);
export const unauthenticated = (msg = "Authentication required") =>
  new AppError("UNAUTHENTICATED", msg);
export const notFound = (msg = "Not found") => new AppError("NOT_FOUND", msg);
