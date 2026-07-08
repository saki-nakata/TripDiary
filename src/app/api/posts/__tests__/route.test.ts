import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/post.service", () => ({
  findFollowingPostsService: vi.fn(),
  createPostService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findFollowingPostsService, createPostService } from "@/lib/services/post.service";
import { GET, POST } from "@/app/api/posts/route";

// `auth()` はミドルウェア呼び出しとセッション取得の2形態でオーバーロードされており、
// vi.mocked() だと型推論がミドルウェア側に寄ってしまうため any 経由でキャストする
const authMock = auth as unknown as Mock;

const USER_ID = "user-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("GET /api/posts", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── GET ───
  it("GET_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest("http://localhost/api/posts"));

    expect(res.status).toBe(401);
    expect(findFollowingPostsService).not.toHaveBeenCalled();
  });

  it("GET_認証済み_200かつ投稿一覧を返す", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findFollowingPostsService).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    const res = await GET(makeRequest("http://localhost/api/posts"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ posts: [], nextCursor: null, hasMore: false });
    expect(findFollowingPostsService).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID }));
  });
});

describe("POST /api/posts", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    title: "テストスポット",
    body: "感想メモ",
    location: "東京都",
    category: "観光",
    visitedAt: "2026-01-01",
  };

  // ─── POST ───
  it("POST_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest("http://localhost/api/posts", { method: "POST", body: JSON.stringify(validBody) })
    );

    expect(res.status).toBe(401);
    expect(createPostService).not.toHaveBeenCalled();
  });

  it("POST_必須項目欠落_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await POST(
      makeRequest("http://localhost/api/posts", { method: "POST", body: JSON.stringify({ title: "" }) })
    );

    expect(res.status).toBe(400);
    expect(createPostService).not.toHaveBeenCalled();
  });

  it("POST_タイトル41文字_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await POST(
      makeRequest("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify({ ...validBody, title: "あ".repeat(41) }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("POST_タイトル40文字_201", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(createPostService).mockResolvedValue({ id: "post-1" } as never);

    const res = await POST(
      makeRequest("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify({ ...validBody, title: "あ".repeat(40) }),
      })
    );

    expect(res.status).toBe(201);
  });
});
