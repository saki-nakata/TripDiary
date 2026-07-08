import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { ValidationError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/follow.service", () => ({
  toggleFollowService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { toggleFollowService } from "@/lib/services/follow.service";
import { POST } from "@/app/api/users/[id]/follow/route";

const authMock = auth as unknown as Mock;

const FOLLOWER_ID = "user-1";
const FOLLOWING_ID = "user-2";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string) {
  return new NextRequest(new Request(url, { method: "POST" }));
}

describe("POST /api/users/[id]/follow", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── POST ───
  it("POST_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(makeRequest(`http://localhost/api/users/${FOLLOWING_ID}/follow`), makeParams(FOLLOWING_ID));

    expect(res.status).toBe(401);
    expect(toggleFollowService).not.toHaveBeenCalled();
  });

  it("POST_自己フォロー_400", async () => {
    authMock.mockResolvedValue({ user: { id: FOLLOWER_ID } } as never);
    vi.mocked(toggleFollowService).mockRejectedValue(new ValidationError("自分自身をフォローすることはできません"));

    const res = await POST(makeRequest(`http://localhost/api/users/${FOLLOWER_ID}/follow`), makeParams(FOLLOWER_ID));

    expect(res.status).toBe(400);
  });

  it("POST_認証済み_トグル結果を返す", async () => {
    authMock.mockResolvedValue({ user: { id: FOLLOWER_ID } } as never);
    vi.mocked(toggleFollowService).mockResolvedValue({ following: true });

    const res = await POST(makeRequest(`http://localhost/api/users/${FOLLOWING_ID}/follow`), makeParams(FOLLOWING_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ following: true });
    expect(toggleFollowService).toHaveBeenCalledWith(FOLLOWER_ID, FOLLOWING_ID);
  });
});
