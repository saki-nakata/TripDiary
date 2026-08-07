import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";
import { withRequestLogging, type AnyRouteHandler } from "@/lib/request-logging";

const authMock = auth as unknown as Mock;

describe("withRequestLogging", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常なレスポンス_元のレスポンスをそのまま返し完了ログを出力する", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const handler: AnyRouteHandler = vi.fn(async () => NextResponse.json({ ok: true }, { status: 200 }));
    const wrapped = withRequestLogging(handler);

    const req = new NextRequest(new Request("http://localhost/api/posts", { method: "GET" }));
    const res = await wrapped(req, {});

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(req, {});
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/api/posts",
        status: 200,
        userId: "user-1",
        requestId: expect.any(String),
        duration_ms: expect.any(Number),
      }),
      "API request completed"
    );
  });

  it("auth()が例外を投げる場合_userIdなしでログを出力する", async () => {
    authMock.mockRejectedValue(new Error("no request scope"));
    const handler: AnyRouteHandler = vi.fn(async () => NextResponse.json({}, { status: 201 }));
    const wrapped = withRequestLogging(handler);

    const req = new NextRequest(new Request("http://localhost/api/auth/signup", { method: "POST" }));
    const res = await wrapped(req, {});

    expect(res.status).toBe(201);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined }),
      "API request completed"
    );
  });

  it("動的ルートのctx({ params })がそのままhandlerに渡される", async () => {
    authMock.mockResolvedValue(null);
    const handler: AnyRouteHandler = vi.fn(async () => NextResponse.json({}, { status: 200 }));
    const wrapped = withRequestLogging(handler);
    const ctx = { params: Promise.resolve({ id: "post-1" }) };

    const req = new NextRequest(new Request("http://localhost/api/posts/post-1", { method: "GET" }));
    await wrapped(req, ctx);

    expect(handler).toHaveBeenCalledWith(req, ctx);
  });

  it("引数無しのハンドラ(静的ルート)_ctx無しで呼び出せる", async () => {
    authMock.mockResolvedValue(null);
    const handler: AnyRouteHandler = vi.fn(async () => NextResponse.json({}, { status: 200 }));
    const wrapped = withRequestLogging(handler);

    const req = new NextRequest(new Request("http://localhost/api/posts/portal", { method: "GET" }));
    const res = await wrapped(req);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(req);
  });

  it("handleApiErrorのエラーログにも同じrequestIdを付与する", async () => {
    authMock.mockResolvedValue(null);
    const handler: AnyRouteHandler = vi.fn(async () => handleApiError(new UnauthorizedError()));
    const wrapped = withRequestLogging(handler);

    const req = new NextRequest(new Request("http://localhost/api/posts", { method: "GET" }));
    const res = await wrapped(req);

    expect(res.status).toBe(401);
    const errorLog = vi.mocked(logger.warn).mock.calls[0]?.[0] as Record<string, unknown>;
    const accessLog = vi.mocked(logger.info).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(errorLog).toEqual(
      expect.objectContaining({
        requestId: accessLog.requestId,
        method: "GET",
        path: "/api/posts",
        errorType: "UnauthorizedError",
      })
    );
  });

  // GATE-35: /api/health はNginx/PM2から高頻度でポーリングされる想定のため、
  // アクセスログ出力・userId解決用のauth()呼び出しの両方をスキップする。
  it("/api/healthへのリクエスト_アクセスログを出力せずauth()も呼び出さない", async () => {
    const handler: AnyRouteHandler = vi.fn(async () => NextResponse.json({ status: "ok" }, { status: 200 }));
    const wrapped = withRequestLogging(handler);

    const req = new NextRequest(new Request("http://localhost/api/health", { method: "GET" }));
    const res = await wrapped(req);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(req);
    expect(logger.info).not.toHaveBeenCalled();
    expect(authMock).not.toHaveBeenCalled();
  });

  // GATE-23: handlerがthrowした場合もアクセスログを1行残し、例外はそのまま呼び出し元へ伝播させる。
  it("handlerがthrowする場合_status500でアクセスログを出力し例外をそのまま再送出する", async () => {
    authMock.mockResolvedValue(null);
    const thrownError = new Error("unexpected failure");
    const handler: AnyRouteHandler = vi.fn(async () => {
      throw thrownError;
    });
    const wrapped = withRequestLogging(handler);

    const req = new NextRequest(new Request("http://localhost/api/posts", { method: "POST" }));

    await expect(wrapped(req)).rejects.toBe(thrownError);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/api/posts",
        status: 500,
        requestId: expect.any(String),
      }),
      "API request completed"
    );
  });
});
