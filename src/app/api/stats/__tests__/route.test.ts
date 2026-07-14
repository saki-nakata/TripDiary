import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/stats.service", () => ({
  getYearlyStatsService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getYearlyStatsService } from "@/lib/services/stats.service";
import { GET } from "@/app/api/stats/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest("http://localhost/api/stats?year=2026"));

    expect(res.status).toBe(401);
    expect(getYearlyStatsService).not.toHaveBeenCalled();
  });

  it("GET_yearパラメータ欠落_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await GET(makeRequest("http://localhost/api/stats"));

    expect(res.status).toBe(400);
    expect(getYearlyStatsService).not.toHaveBeenCalled();
  });

  it("GET_yearが数値でない_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await GET(makeRequest("http://localhost/api/stats?year=abc"));

    expect(res.status).toBe(400);
  });

  it("GET_正常なyear_200かつ年別統計を返す", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getYearlyStatsService).mockResolvedValue({ year: 2026, totalPosts: 3 } as never);

    const res = await GET(makeRequest("http://localhost/api/stats?year=2026"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.year).toBe(2026);
    expect(getYearlyStatsService).toHaveBeenCalledWith(USER_ID, 2026);
  });

  it("GET_year=all_200かつnullでサービスが呼ばれる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getYearlyStatsService).mockResolvedValue({ year: "all", totalPosts: 10 } as never);

    const res = await GET(makeRequest("http://localhost/api/stats?year=all"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.year).toBe("all");
    expect(getYearlyStatsService).toHaveBeenCalledWith(USER_ID, null);
  });
});
