import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/repositories/post.repository", () => ({
  findExplorePosts: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findExplorePosts } from "@/lib/repositories/post.repository";
import { GET } from "@/app/api/posts/explore/route";

const authMock = auth as unknown as Mock;

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/posts/explore", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── GET ───
  it("GET_認証不要_未認証でも200を返す", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findExplorePosts).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    const res = await GET(makeRequest("http://localhost/api/posts/explore"));

    expect(res.status).toBe(200);
  });

  it("GET_qパラメータあり_findExplorePostsにqが渡される", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findExplorePosts).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/posts/explore?q=竹林"));

    expect(findExplorePosts).toHaveBeenCalledWith(expect.objectContaining({ q: "竹林" }));
  });

  it("GET_qパラメータなし_qはundefinedで呼ばれる", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findExplorePosts).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/posts/explore"));

    expect(findExplorePosts).toHaveBeenCalledWith(expect.objectContaining({ q: undefined }));
  });
});
