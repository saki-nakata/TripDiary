import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/post.service", () => ({
  findVisitedPostsService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findVisitedPostsService } from "@/lib/services/post.service";
import { GET } from "@/app/api/mypage/visited/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/mypage/visited（GATE-22種類A: 継続取得API、本人限定）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証_401かつrepositoryは呼ばれない", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest("http://localhost/api/mypage/visited"));

    expect(res.status).toBe(401);
    expect(findVisitedPostsService).not.toHaveBeenCalled();
  });

  it("認証済み_セッションのuserIdのみで呼ばれる（クライアント指定のuserIdは受け付けない）", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findVisitedPostsService).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/mypage/visited?userId=other-user&cursor=post-5"));

    expect(findVisitedPostsService).toHaveBeenCalledWith({ userId: USER_ID, cursor: "post-5", limit: 20 });
  });

  it("limitは50を超えて指定しても50に丸められる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findVisitedPostsService).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/mypage/visited?limit=999"));

    expect(findVisitedPostsService).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});
