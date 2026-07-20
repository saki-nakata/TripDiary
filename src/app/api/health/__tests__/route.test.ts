import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/health.service", () => ({
  checkHealthService: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { checkHealthService } from "@/lib/services/health.service";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── GET ───
  it("GET_DB接続成功_200でstatus:okを返す", async () => {
    vi.mocked(checkHealthService).mockResolvedValue();

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });

  it("GET_DB接続失敗_503でstatus:errorを返す", async () => {
    vi.mocked(checkHealthService).mockRejectedValue(new Error("connection refused"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual({ status: "error" });
  });
});
