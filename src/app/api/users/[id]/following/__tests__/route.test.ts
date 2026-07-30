import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/follow.service", () => ({
  findFollowingService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findFollowingService } from "@/lib/services/follow.service";
import { GET } from "@/app/api/users/[id]/following/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const VIEWER_ID = "viewer-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

function makeParams() {
  return { params: Promise.resolve({ id: USER_ID }) };
}

describe("GET /api/users/[id]/following（GATE-22種類B: 継続取得API、認証不要）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証でも200を返し、viewerIdはundefinedで渡される", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findFollowingService).mockResolvedValue({ users: [], nextCursor: null, hasMore: false });

    const res = await GET(makeRequest(`http://localhost/api/users/${USER_ID}/following`), makeParams());

    expect(res.status).toBe(200);
    expect(findFollowingService).toHaveBeenCalledWith({ userId: USER_ID, viewerId: undefined, cursor: undefined, limit: 20 });
  });

  it("認証済み_viewerIdとしてセッションのuserIdが渡される", async () => {
    authMock.mockResolvedValue({ user: { id: VIEWER_ID } } as never);
    vi.mocked(findFollowingService).mockResolvedValue({ users: [], nextCursor: null, hasMore: false });

    await GET(makeRequest(`http://localhost/api/users/${USER_ID}/following`), makeParams());

    expect(findFollowingService).toHaveBeenCalledWith(expect.objectContaining({ viewerId: VIEWER_ID }));
  });

  it("limitは50を超えて指定しても50に丸められる", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(findFollowingService).mockResolvedValue({ users: [], nextCursor: null, hasMore: false });

    await GET(makeRequest(`http://localhost/api/users/${USER_ID}/following?limit=999`), makeParams());

    expect(findFollowingService).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});
