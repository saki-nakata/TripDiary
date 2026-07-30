import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  deleteTestUserByEmailService: vi.fn(),
}));

import { deleteTestUserByEmailService } from "@/lib/services/user.service";
import { DELETE } from "@/app/api/test/cleanup/route";

const VALID_SECRET = "test-cleanup-secret-for-unit-test";

function makeRequest(url: string, headers?: HeadersInit) {
  return new NextRequest(new Request(url, { headers }));
}

describe("DELETE /api/test/cleanup", () => {
  const originalFlag = process.env.ENABLE_TEST_ENDPOINTS;
  const originalSecret = process.env.TEST_CLEANUP_SECRET;

  beforeEach(() => vi.clearAllMocks());

  afterEach(() => {
    process.env.ENABLE_TEST_ENDPOINTS = originalFlag;
    process.env.TEST_CLEANUP_SECRET = originalSecret;
  });

  it("ENABLE_TEST_ENDPOINTS未設定_403", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "false";
    process.env.TEST_CLEANUP_SECRET = VALID_SECRET;

    const res = await DELETE(
      makeRequest("http://localhost/api/test/cleanup?email=test@example.com", { "x-test-cleanup-secret": VALID_SECRET })
    );

    expect(res.status).toBe(403);
    expect(deleteTestUserByEmailService).not.toHaveBeenCalled();
  });

  it("ENABLE_TEST_ENDPOINTS=trueだがTEST_CLEANUP_SECRET未設定_403（GATE-03、フェイルセーフ）", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    delete process.env.TEST_CLEANUP_SECRET;

    const res = await DELETE(
      makeRequest("http://localhost/api/test/cleanup?email=test@example.com", { "x-test-cleanup-secret": VALID_SECRET })
    );

    expect(res.status).toBe(403);
    expect(deleteTestUserByEmailService).not.toHaveBeenCalled();
  });

  it("ENABLE_TEST_ENDPOINTS=true・TEST_CLEANUP_SECRET設定済みだがヘッダー不一致_403（GATE-03）", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    process.env.TEST_CLEANUP_SECRET = VALID_SECRET;

    const res = await DELETE(
      makeRequest("http://localhost/api/test/cleanup?email=test@example.com", { "x-test-cleanup-secret": "wrong-secret" })
    );

    expect(res.status).toBe(403);
    expect(deleteTestUserByEmailService).not.toHaveBeenCalled();
  });

  it("email未指定_400", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    process.env.TEST_CLEANUP_SECRET = VALID_SECRET;

    const res = await DELETE(makeRequest("http://localhost/api/test/cleanup", { "x-test-cleanup-secret": VALID_SECRET }));

    expect(res.status).toBe(400);
    expect(deleteTestUserByEmailService).not.toHaveBeenCalled();
  });

  it("正常系_200", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    process.env.TEST_CLEANUP_SECRET = VALID_SECRET;
    vi.mocked(deleteTestUserByEmailService).mockResolvedValue({ count: 1 } as never);

    const res = await DELETE(
      makeRequest("http://localhost/api/test/cleanup?email=test@example.com", { "x-test-cleanup-secret": VALID_SECRET })
    );

    expect(res.status).toBe(200);
    expect(deleteTestUserByEmailService).toHaveBeenCalledWith("test@example.com");
  });

  it("DB失敗_500", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    process.env.TEST_CLEANUP_SECRET = VALID_SECRET;
    vi.mocked(deleteTestUserByEmailService).mockRejectedValue(new Error("db error"));

    const res = await DELETE(
      makeRequest("http://localhost/api/test/cleanup?email=test@example.com", { "x-test-cleanup-secret": VALID_SECRET })
    );

    expect(res.status).toBe(500);
  });
});
