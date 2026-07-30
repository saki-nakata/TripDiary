import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/post.service", () => ({
  findPostsByAuthorIdService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findPostsByAuthorIdService } from "@/lib/services/post.service";
import { GET } from "@/app/api/users/[id]/posts/route";

const authMock = auth as unknown as Mock;
const AUTHOR_ID = "author-1";
const VIEWER_ID = "viewer-2";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

function makeParams() {
  return { params: Promise.resolve({ id: AUTHOR_ID }) };
}

describe("GET /api/users/[id]/posts（GATE-22種類A: 継続取得API）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証でも200を返す（公開プロフィールの投稿一覧は認証不要）", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findPostsByAuthorIdService).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    const res = await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/posts`), makeParams());

    expect(res.status).toBe(200);
    expect(findPostsByAuthorIdService).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: AUTHOR_ID, viewerId: undefined })
    );
  });

  it("認証済み_viewerIdとしてセッションのuserIdが渡される", async () => {
    authMock.mockResolvedValue({ user: { id: VIEWER_ID } } as never);
    vi.mocked(findPostsByAuthorIdService).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/posts`), makeParams());

    expect(findPostsByAuthorIdService).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: AUTHOR_ID, viewerId: VIEWER_ID })
    );
  });

  it("cursor・year・limitパラメータがそのまま渡される", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findPostsByAuthorIdService).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/posts?cursor=post-9&year=2026&limit=10`), makeParams());

    expect(findPostsByAuthorIdService).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: AUTHOR_ID, cursor: "post-9", year: 2026, limit: 10 })
    );
  });

  it("limitは50を超えて指定しても50に丸められる", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findPostsByAuthorIdService).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/posts?limit=999`), makeParams());

    expect(findPostsByAuthorIdService).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});
