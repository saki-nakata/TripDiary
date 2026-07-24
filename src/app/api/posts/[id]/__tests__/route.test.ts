import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/post.service", () => ({
  findPostByIdService: vi.fn(),
  updatePostService: vi.fn(),
  deletePostService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findPostByIdService, updatePostService, deletePostService } from "@/lib/services/post.service";
import { GET, PUT, DELETE } from "@/app/api/posts/[id]/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const POST_ID = "post-1";

const VALID_BODY = {
  title: "スポット",
  body: "感想",
  location: "東京都",
  category: "観光",
  visitedAt: "2026-07-01",
};

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

function makeParams() {
  return { params: Promise.resolve({ id: POST_ID }) };
}

describe("GET /api/posts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_存在しない投稿_404", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findPostByIdService).mockRejectedValue(new NotFoundError());

    const res = await GET(makeRequest(`http://localhost/api/posts/${POST_ID}`), makeParams());

    expect(res.status).toBe(404);
  });

  it("GET_未認証でも公開閲覧できる_200", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findPostByIdService).mockResolvedValue({ id: POST_ID, ...VALID_BODY } as never);

    const res = await GET(makeRequest(`http://localhost/api/posts/${POST_ID}`), makeParams());

    expect(res.status).toBe(200);
    expect(findPostByIdService).toHaveBeenCalledWith(POST_ID, undefined);
  });

  it("GET_認証済み_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findPostByIdService).mockResolvedValue({ id: POST_ID, ...VALID_BODY } as never);

    const res = await GET(makeRequest(`http://localhost/api/posts/${POST_ID}`), makeParams());

    expect(res.status).toBe(200);
    expect(findPostByIdService).toHaveBeenCalledWith(POST_ID, USER_ID);
  });
});

describe("PUT /api/posts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PUT_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PUT(
      makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "PUT", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );

    expect(res.status).toBe(401);
    expect(updatePostService).not.toHaveBeenCalled();
  });

  it("PUT_存在しない投稿_404", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(updatePostService).mockRejectedValue(new NotFoundError());

    const res = await PUT(
      makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "PUT", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );

    expect(res.status).toBe(404);
  });

  it("PUT_他人の投稿_403", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(updatePostService).mockRejectedValue(new ForbiddenError());

    const res = await PUT(
      makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "PUT", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );

    expect(res.status).toBe(403);
  });

  it("PUT_本人の投稿_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(updatePostService).mockResolvedValue({ id: POST_ID, ...VALID_BODY } as never);

    const res = await PUT(
      makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "PUT", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );

    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/posts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DELETE_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await DELETE(makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(401);
    expect(deletePostService).not.toHaveBeenCalled();
  });

  it("DELETE_存在しない投稿_404", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(deletePostService).mockRejectedValue(new NotFoundError());

    const res = await DELETE(makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(404);
  });

  it("DELETE_他人の投稿_403", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(deletePostService).mockRejectedValue(new ForbiddenError());

    const res = await DELETE(makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(403);
  });

  it("DELETE_本人の投稿_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(deletePostService).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest(`http://localhost/api/posts/${POST_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(200);
  });
});
