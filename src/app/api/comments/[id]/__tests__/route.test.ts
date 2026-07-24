import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/comment.service", () => ({
  deleteCommentService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { deleteCommentService } from "@/lib/services/comment.service";
import { DELETE } from "@/app/api/comments/[id]/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const COMMENT_ID = "comment-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

function makeParams() {
  return { params: Promise.resolve({ id: COMMENT_ID }) };
}

describe("DELETE /api/comments/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DELETE_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await DELETE(makeRequest(`http://localhost/api/comments/${COMMENT_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(401);
    expect(deleteCommentService).not.toHaveBeenCalled();
  });

  it("DELETE_存在しないコメント_404", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(deleteCommentService).mockRejectedValue(new NotFoundError());

    const res = await DELETE(makeRequest(`http://localhost/api/comments/${COMMENT_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(404);
  });

  it("DELETE_権限なし_403", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(deleteCommentService).mockRejectedValue(new ForbiddenError());

    const res = await DELETE(makeRequest(`http://localhost/api/comments/${COMMENT_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(403);
  });

  it("DELETE_本人または投稿オーナー_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(deleteCommentService).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest(`http://localhost/api/comments/${COMMENT_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(200);
  });
});
