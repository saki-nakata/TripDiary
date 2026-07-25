import { NextResponse } from "next/server";
import { logger } from "./logger";
import { captureException } from "./monitoring";
import { UnauthorizedError, NotFoundError, ForbiddenError, ValidationError, ConflictError, RateLimitError } from "./errors";
import { getRequestContext } from "./request-context";

export function handleApiError(e: unknown): NextResponse {
  const requestContext = getRequestContext();
  if (e instanceof UnauthorizedError) {
    logger.warn({ ...requestContext, errorType: "UnauthorizedError", message: e.message }, "API request failed: unauthorized");
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
  if (e instanceof NotFoundError) {
    logger.warn({ ...requestContext, errorType: "NotFoundError", message: e.message }, "API request failed: not found");
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
  if (e instanceof ForbiddenError) {
    logger.warn({ ...requestContext, errorType: "ForbiddenError", message: e.message }, "API request failed: forbidden");
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  if (e instanceof ValidationError) {
    logger.warn({ ...requestContext, errorType: "ValidationError", details: e.details }, "API request failed: validation error");
    return NextResponse.json({ error: e.message, ...(e.details ? { details: e.details } : {}) }, { status: 400 });
  }
  if (e instanceof ConflictError) {
    logger.warn({ ...requestContext, errorType: "ConflictError", message: e.message }, "API request failed: conflict");
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
  if (e instanceof RateLimitError) {
    logger.warn({ ...requestContext, errorType: "RateLimitError", message: e.message }, "API request failed: rate limited");
    return NextResponse.json({ error: e.message }, { status: 429 });
  }
  logger.error({ ...requestContext, err: e }, "API request failed: unhandled error");
  // 5xx（未捕捉例外）のみ監視SaaSへ送信（現状はDSN未設定のためno-op）
  captureException(e, requestContext ? { source: `${requestContext.method ?? "UNKNOWN"} ${requestContext.path ?? "unknown"}` } : undefined);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
