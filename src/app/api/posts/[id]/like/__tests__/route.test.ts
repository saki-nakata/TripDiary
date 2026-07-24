import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/like.service", () => ({
  toggleLikeService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { toggleLikeService } from "@/lib/services/like.service";
import { POST } from "@/app/api/posts/[id]/like/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const POST_ID = "post-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

function makeParams() {
  return { params: Promise.resolve({ id: POST_ID }) };
}

describe("POST /api/posts/[id]/like", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(makeRequest(`http://localhost/api/posts/${POST_ID}/like`, { method: "POST" }), makeParams());

    expect(res.status).toBe(401);
    expect(toggleLikeService).not.toHaveBeenCalled();
  });

  it("POST_正常系_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(toggleLikeService).mockResolvedValue({ liked: true } as never);

    const res = await POST(makeRequest(`http://localhost/api/posts/${POST_ID}/like`, { method: "POST" }), makeParams());

    expect(res.status).toBe(200);
    expect(toggleLikeService).toHaveBeenCalledWith(USER_ID, POST_ID);
  });
});
