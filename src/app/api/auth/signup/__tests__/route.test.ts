import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/auth.service", () => ({
  signupService: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { signupService } from "@/lib/services/auth.service";
import { ConflictError } from "@/lib/errors";
import { __resetRateLimitForTests } from "@/lib/rate-limit";
import { POST } from "@/app/api/auth/signup/route";

const VALID_BODY = { nickname: "テストユーザー", email: "test@example.com", password: "password123" };

function makeRequest(body: unknown, ip = "203.0.113.1") {
  return new NextRequest(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitForTests();
  });

  // ─── POST ───
  it("POST_正常なリクエスト_201でユーザーを返す", async () => {
    vi.mocked(signupService).mockResolvedValue({ id: "user-1" } as never);

    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ id: "user-1" });
  });

  it("POST_メールアドレス重複_409", async () => {
    vi.mocked(signupService).mockRejectedValue(new ConflictError("このメールアドレスはすでに使用されています"));

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(409);
  });

  it("POST_バリデーションエラー_400でserviceが呼ばれない", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: "invalid-email" }));

    expect(res.status).toBe(400);
    expect(signupService).not.toHaveBeenCalled();
  });

  it("POST_同一IPから上限を超えて送信_429", async () => {
    vi.mocked(signupService).mockResolvedValue({ id: "user-1" } as never);

    for (let i = 0; i < 10; i++) {
      const res = await POST(makeRequest(VALID_BODY, "203.0.113.9"));
      expect(res.status).toBe(201);
    }
    const res = await POST(makeRequest(VALID_BODY, "203.0.113.9"));

    expect(res.status).toBe(429);
  });
});
