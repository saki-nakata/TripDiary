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

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("DELETE /api/test/cleanup", () => {
  const originalFlag = process.env.ENABLE_TEST_ENDPOINTS;

  beforeEach(() => vi.clearAllMocks());

  afterEach(() => {
    process.env.ENABLE_TEST_ENDPOINTS = originalFlag;
  });

  it("ENABLE_TEST_ENDPOINTS未設定_403", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "false";

    const res = await DELETE(makeRequest("http://localhost/api/test/cleanup?email=test@example.com"));

    expect(res.status).toBe(403);
    expect(deleteTestUserByEmailService).not.toHaveBeenCalled();
  });

  it("email未指定_400", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";

    const res = await DELETE(makeRequest("http://localhost/api/test/cleanup"));

    expect(res.status).toBe(400);
    expect(deleteTestUserByEmailService).not.toHaveBeenCalled();
  });

  it("正常系_200", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    vi.mocked(deleteTestUserByEmailService).mockResolvedValue({ count: 1 } as never);

    const res = await DELETE(makeRequest("http://localhost/api/test/cleanup?email=test@example.com"));

    expect(res.status).toBe(200);
    expect(deleteTestUserByEmailService).toHaveBeenCalledWith("test@example.com");
  });

  it("DB失敗_500", async () => {
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    vi.mocked(deleteTestUserByEmailService).mockRejectedValue(new Error("db error"));

    const res = await DELETE(makeRequest("http://localhost/api/test/cleanup?email=test@example.com"));

    expect(res.status).toBe(500);
  });
});
