import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/plan.service", () => ({
  findCompletedPlansByUserIdService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCompletedPlansByUserIdService } from "@/lib/services/plan.service";
import { GET } from "@/app/api/mypage/plans/completed/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/mypage/plans/completed（GATE-22種類B: 継続取得API、本人限定）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証_401かつserviceは呼ばれない", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest("http://localhost/api/mypage/plans/completed"));

    expect(res.status).toBe(401);
    expect(findCompletedPlansByUserIdService).not.toHaveBeenCalled();
  });

  it("認証済み_year未指定_yearはundefinedのままセッションのuserIdで呼ばれる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findCompletedPlansByUserIdService).mockResolvedValue({ plans: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/mypage/plans/completed?userId=other-user&cursor=plan-5"));

    expect(findCompletedPlansByUserIdService).toHaveBeenCalledWith({
      userId: USER_ID,
      year: undefined,
      cursor: "plan-5",
      limit: 20,
    });
  });

  it("認証済み_year指定_数値に変換して渡される", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findCompletedPlansByUserIdService).mockResolvedValue({ plans: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/mypage/plans/completed?year=2026"));

    expect(findCompletedPlansByUserIdService).toHaveBeenCalledWith(expect.objectContaining({ year: 2026 }));
  });

  it("limitは50を超えて指定しても50に丸められる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findCompletedPlansByUserIdService).mockResolvedValue({ plans: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/mypage/plans/completed?limit=999"));

    expect(findCompletedPlansByUserIdService).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});
