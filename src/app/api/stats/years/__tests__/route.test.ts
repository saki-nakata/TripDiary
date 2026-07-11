import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/stats.service", () => ({
  getAvailableYearsService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getAvailableYearsService } from "@/lib/services/stats.service";
import { GET } from "@/app/api/stats/years/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

describe("GET /api/stats/years", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getAvailableYearsService).not.toHaveBeenCalled();
  });

  it("GET_認証済み_200かつ年一覧を返す", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getAvailableYearsService).mockResolvedValue([2026, 2025]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([2026, 2025]);
    expect(getAvailableYearsService).toHaveBeenCalledWith(USER_ID);
  });
});
