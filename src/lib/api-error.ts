import { NextResponse } from "next/server";
import { logger } from "./logger";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "./errors";

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof NotFoundError) {
    logger.warn({ errorType: "NotFoundError", message: e.message }, "API request failed: not found");
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
  if (e instanceof ForbiddenError) {
    logger.warn({ errorType: "ForbiddenError", message: e.message }, "API request failed: forbidden");
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  if (e instanceof ValidationError) {
    logger.warn({ errorType: "ValidationError", details: e.details }, "API request failed: validation error");
    return NextResponse.json({ error: e.details ?? e.message }, { status: 400 });
  }
  if (e instanceof ConflictError) {
    logger.warn({ errorType: "ConflictError", message: e.message }, "API request failed: conflict");
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
  logger.error({ err: e }, "API request failed: unhandled error");
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
