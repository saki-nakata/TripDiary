import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  findCommentsByAuthorService: vi.fn(),
}));

import { findCommentsByAuthorService } from "@/lib/services/user.service";
import { GET } from "@/app/api/users/[id]/comments/route";

const AUTHOR_ID = "author-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

function makeParams() {
  return { params: Promise.resolve({ id: AUTHOR_ID }) };
}

describe("GET /api/users/[id]/comments（GATE-22種類B: 継続取得API、認証不要）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証でも200を返す", async () => {
    vi.mocked(findCommentsByAuthorService).mockResolvedValue({ comments: [], nextCursor: null, hasMore: false });

    const res = await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/comments`), makeParams());

    expect(res.status).toBe(200);
    expect(findCommentsByAuthorService).toHaveBeenCalledWith({ authorId: AUTHOR_ID, cursor: undefined, limit: 20 });
  });

  it("cursor指定_そのまま渡される", async () => {
    vi.mocked(findCommentsByAuthorService).mockResolvedValue({ comments: [], nextCursor: null, hasMore: false });

    await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/comments?cursor=comment-9`), makeParams());

    expect(findCommentsByAuthorService).toHaveBeenCalledWith(expect.objectContaining({ cursor: "comment-9" }));
  });

  it("limitは50を超えて指定しても50に丸められる", async () => {
    vi.mocked(findCommentsByAuthorService).mockResolvedValue({ comments: [], nextCursor: null, hasMore: false });

    await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/comments?limit=999`), makeParams());

    expect(findCommentsByAuthorService).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});
