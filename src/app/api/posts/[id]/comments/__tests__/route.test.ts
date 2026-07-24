import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/comment.service", () => ({
  findCommentsByPostIdService: vi.fn(),
  createCommentService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCommentsByPostIdService, createCommentService } from "@/lib/services/comment.service";
import { GET, POST } from "@/app/api/posts/[id]/comments/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const POST_ID = "post-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

function makeParams() {
  return { params: Promise.resolve({ id: POST_ID }) };
}

describe("GET /api/posts/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_コメント一覧_200", async () => {
    vi.mocked(findCommentsByPostIdService).mockResolvedValue({ items: [], nextCursor: null } as never);

    const res = await GET(makeRequest(`http://localhost/api/posts/${POST_ID}/comments`), makeParams());

    expect(res.status).toBe(200);
  });
});

describe("POST /api/posts/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest(`http://localhost/api/posts/${POST_ID}/comments`, { method: "POST", body: JSON.stringify({ body: "コメント" }) }),
      makeParams()
    );

    expect(res.status).toBe(401);
    expect(createCommentService).not.toHaveBeenCalled();
  });

  it("POST_本文未指定_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await POST(
      makeRequest(`http://localhost/api/posts/${POST_ID}/comments`, { method: "POST", body: JSON.stringify({ body: "" }) }),
      makeParams()
    );

    expect(res.status).toBe(400);
  });

  it("POST_正常系_201", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(createCommentService).mockResolvedValue({ id: "comment-1", body: "コメント" } as never);

    const res = await POST(
      makeRequest(`http://localhost/api/posts/${POST_ID}/comments`, { method: "POST", body: JSON.stringify({ body: "コメント" }) }),
      makeParams()
    );

    expect(res.status).toBe(201);
  });
});
