import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/plan.service", () => ({
  findActivePlansByUserIdService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findActivePlansByUserIdService } from "@/lib/services/plan.service";
import { GET } from "@/app/api/mypage/plans/active/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/mypage/plans/active（GATE-22種類B: 継続取得API、本人限定）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証_401かつserviceは呼ばれない", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest("http://localhost/api/mypage/plans/active"));

    expect(res.status).toBe(401);
    expect(findActivePlansByUserIdService).not.toHaveBeenCalled();
  });

  it("認証済み_セッションのuserIdのみで呼ばれる（クライアント指定のuserIdは受け付けない）", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findActivePlansByUserIdService).mockResolvedValue({ plans: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/mypage/plans/active?userId=other-user&cursor=plan-5"));

    expect(findActivePlansByUserIdService).toHaveBeenCalledWith({ userId: USER_ID, cursor: "plan-5", limit: 20 });
  });

  it("limitは50を超えて指定しても50に丸められる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findActivePlansByUserIdService).mockResolvedValue({ plans: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/mypage/plans/active?limit=999"));

    expect(findActivePlansByUserIdService).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});
